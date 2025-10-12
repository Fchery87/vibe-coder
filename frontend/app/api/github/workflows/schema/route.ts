import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

// GET /api/github/workflows/schema?owner=...&repo=...&path=...&installation_id=...
// Attempts to parse workflow_dispatch inputs from the YAML file
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path");
  const installationId = searchParams.get("installation_id");

  if (!owner || !repo || !path || !installationId) {
    return NextResponse.json(
      { error: true, message: "owner, repo, path, and installation_id are required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId, 10));
    const { data }: any = await octokit.repos.getContent({ owner, repo, path });

    if (!data || data.type !== "file" || !data.content) {
      return NextResponse.json({ inputs: [] });
    }

    const content = Buffer.from(data.content, data.encoding || "base64").toString("utf8");

    // Naive YAML scan to extract keys under on.workflow_dispatch.inputs
    // This is intentionally simple to avoid adding a YAML parser.
    const inputs: Array<{ key: string; description?: string; required?: boolean; default?: string }> = [];
    const lines = content.split(/\r?\n/);
    let inOn = false;
    let inDispatch = false;
    let inInputs = false;
    let baseIndent = 0;

    function indentOf(s: string) { const m = s.match(/^(\s*)/); return m ? m[1].length : 0; }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.replace(/#.*$/, ""); // strip comments
      if (!line.trim()) continue;
      const ind = indentOf(line);

      const key = line.trim();
      if (!inOn) {
        if (/^on:\s*$/.test(key)) { inOn = true; baseIndent = ind; continue; }
        continue;
      }
      if (inOn && ind <= baseIndent) { inOn = false; inDispatch = false; inInputs = false; continue; }

      if (!inDispatch) {
        if (/^workflow_dispatch:\s*$/.test(key)) { inDispatch = true; baseIndent = ind; continue; }
        continue;
      }
      if (inDispatch && ind <= baseIndent) { inDispatch = false; inInputs = false; continue; }

      if (!inInputs) {
        if (/^inputs:\s*$/.test(key)) { inInputs = true; baseIndent = ind; continue; }
        continue;
      }
      if (inInputs && ind <= baseIndent) { inInputs = false; continue; }

      // Inside inputs mapping: first-level keys are input names
      const m = line.match(/^(\s*)([A-Za-z0-9_\-\.]+):\s*(.*)$/);
      if (m) {
        const k = m[2];
        // Collect optional metadata in following indented lines
        let j = i + 1;
        let description: string | undefined;
        let required: boolean | undefined;
        let def: string | undefined;
        const childIndent = indentOf(lines[i + 1] || "    ");
        while (j < lines.length && indentOf(lines[j]) >= childIndent) {
          const li = lines[j].trim();
          const kv = li.match(/^([A-Za-z_]+):\s*(.*)$/);
          if (kv) {
            const kk = kv[1];
            const vv = kv[2].replace(/^['"]|['"]$/g, "");
            if (kk === "description") description = vv;
            if (kk === "required") required = vv === "true";
            if (kk === "default") def = vv;
          }
          j++;
        }
        inputs.push({ key: k, description, required, default: def });
      }
    }

    return NextResponse.json({ inputs });
  } catch (error: any) {
    console.error("Failed to parse workflow schema:", error);
    return NextResponse.json({ error: true, message: error.message || "Failed to parse" }, { status: 200 });
  }
}

