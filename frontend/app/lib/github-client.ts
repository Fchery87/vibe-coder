import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

// Create App client for installation token generation
export function createAppClient() {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    },
  });
}

// Get installation-specific client with installation token
export async function getInstallationClient(installationId: number) {
  const appOctokit = createAppClient();
  const { token } = await appOctokit.auth({
    type: "installation",
    installationId
  }) as { token: string };

  return new Octokit({ auth: token });
}

// Get user client with OAuth token
export function getUserClient(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

// Verify webhook signature
export function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return `sha256=${hmac}` === signature;
}

// Generate random state for OAuth
export function generateState(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Parse unified diff patch
export function parsePatch(patch: string) {
  const lines = patch.split('\n');
  const hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: Array<{ type: 'add' | 'remove' | 'context'; content: string; oldLine?: number; newLine?: number }>;
  }> = [];

  let currentHunk: any = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (match) {
        if (currentHunk) hunks.push(currentHunk);

        currentHunk = {
          oldStart: parseInt(match[1]),
          oldLines: parseInt(match[2] || '1'),
          newStart: parseInt(match[3]),
          newLines: parseInt(match[4] || '1'),
          lines: []
        };
        oldLine = currentHunk.oldStart;
        newLine = currentHunk.newStart;
      }
    } else if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({ type: 'add', content: line.slice(1), newLine: newLine++ });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ type: 'remove', content: line.slice(1), oldLine: oldLine++ });
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLine: oldLine++,
          newLine: newLine++
        });
      }
    }
  }

  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}
