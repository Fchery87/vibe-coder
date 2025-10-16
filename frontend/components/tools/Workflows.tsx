"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToolDrawerPanel, {
  ToolEmptyState,
  ToolErrorState,
  ToolLoadingState,
} from "@/components/ToolDrawerPanel";
import { Play, RefreshCw } from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import WorkflowRunCard from "@/components/WorkflowRunCard";
import { Button } from "@/components/ui/button";

interface Workflow {
  id: number;
  name: string;
  state?: string;
  path?: string;
}

interface Props {
  owner: string;
  repo: string;
  installationId: number;
}

export default function WorkflowsPanel({ owner, repo, installationId }: Props) {
  const enabled = useFeatureFlag("enableWorkflows");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [downloadingRunId, setDownloadingRunId] = useState<number | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [refInput, setRefInput] = useState<string>("main");
  const [inputs, setInputs] = useState<Array<{ key: string; value: string }>>([]);
  const [schemaHint, setSchemaHint] = useState<
    Array<{ key: string; description?: string; required?: boolean; default?: string }>
  >([]);
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const lastRunStatus = useRef<Record<number, string>>({});

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selected) || null,
    [selected, workflows]
  );

  const loadWorkflows = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/github/workflows?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(
          repo
        )}&installation_id=${installationId}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.message || "Failed to load workflows");
      setActionsDisabled(false);
      setWorkflows(data.workflows || []);
      if (!selected && data.workflows?.length) {
        setSelected(data.workflows[0].id);
      }
    } catch (e: any) {
      setError(e.message);
      if (/Actions may be disabled/i.test(e.message)) setActionsDisabled(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, owner, repo, installationId, selected]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const loadRuns = useCallback(
    async (workflowId?: number | null) => {
      const targetId = workflowId ?? selected;
      if (!targetId) return;
      try {
        const res = await fetch(
          `/api/github/runs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(
            repo
          )}&installation_id=${installationId}&workflow_id=${targetId}`
        );
        const data = await res.json();
        if (!data.error) {
          const newRuns = data.runs || [];
          newRuns.forEach((r: any) => {
            const prev = lastRunStatus.current[r.id];
            if (prev && prev !== r.status && r.status === "completed") {
              const type = r.conclusion === "success" ? "success" : "error";
              const title = `Workflow ${r.name || r.run_number} completed`;
              const message = `Conclusion: ${r.conclusion || "unknown"}`;
              try {
                window.dispatchEvent(
                  new CustomEvent("atlas-notification", {
                    detail: { type, title, message, url: r.html_url, urlLabel: "View run" },
                  })
                );
              } catch {}
            }
            lastRunStatus.current[r.id] = r.status;
          });
          setRuns(newRuns);
        }
      } catch {}
    },
    [installationId, owner, repo, selected]
  );

  useEffect(() => {
    loadRuns();
    const timer = window.setInterval(() => loadRuns(), 10000);
    return () => window.clearInterval(timer);
  }, [loadRuns]);

  useEffect(() => {
    const wf = selected ? workflows.find((w) => w.id === selected) : null;
    const workflowPath = wf?.path;
    if (!wf || !workflowPath) {
      setSchemaHint([]);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(
          `/api/github/workflows/schema?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(
            repo
          )}&installation_id=${installationId}&path=${encodeURIComponent(workflowPath)}`
        );
        const data = await res.json();
        if (!data.error) {
          setSchemaHint(data.inputs || []);
          if ((data.inputs || []).length > 0 && inputs.length === 0) {
            setInputs((data.inputs as any[]).map((i: any) => ({ key: i.key, value: i.default ?? "" })));
          }
        }
      } catch {}
    };
    load();
  }, [selected, workflows, owner, repo, installationId, inputs.length]);

  useEffect(() => {
    const handleWorkflowRun = (event: any) => {
      const detail = event.detail;
      const workflowRun = detail?.workflow_run;
      const workflowId =
        workflowRun?.workflow_id ?? detail?.check_run?.check_suite?.workflow_id ?? null;
      if (!workflowId && !workflowRun) return;
      if (!selected || workflowId === selected) {
        loadRuns(workflowId ?? selected);
      }
    };
    const handleWorkflowDispatch = () => loadWorkflows();
    const handleAutoRefresh = () => {
      loadWorkflows();
      loadRuns();
    };
    window.addEventListener("github:workflow_run", handleWorkflowRun as EventListener);
    window.addEventListener("github:workflow_job", handleWorkflowRun as EventListener);
    window.addEventListener("github:check_run", handleWorkflowRun as EventListener);
    window.addEventListener("github:workflow_dispatch", handleWorkflowDispatch as EventListener);
    window.addEventListener("github:auto-refresh", handleAutoRefresh as EventListener);
    return () => {
      window.removeEventListener("github:workflow_run", handleWorkflowRun as EventListener);
      window.removeEventListener("github:workflow_job", handleWorkflowRun as EventListener);
      window.removeEventListener("github:check_run", handleWorkflowRun as EventListener);
      window.removeEventListener("github:workflow_dispatch", handleWorkflowDispatch as EventListener);
      window.removeEventListener("github:auto-refresh", handleAutoRefresh as EventListener);
    };
  }, [loadWorkflows, loadRuns, selected]);

  const trigger = async () => {
    if (!selected) return;
    setIsDispatching(true);
    try {
      const hasInputs = inputs.some((i) => i.key.trim().length > 0);
      const payloadInputs = hasInputs
        ? inputs.reduce<Record<string, string>>((acc, cur) => {
            if (cur.key.trim()) acc[cur.key.trim()] = cur.value;
            return acc;
          }, {})
        : undefined;
      const res = await fetch(`/api/github/workflows/${selected}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, ref: refInput, installation_id: installationId, inputs: payloadInputs }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message || "Failed to dispatch workflow");
      setTimeout(() => {
        loadRuns(selected);
      }, 1000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const downloadLogs = async (runId: number) => {
    try {
      setDownloadingRunId(runId);
      const url = `/api/github/runs/${runId}/logs?owner=${owner}&repo=${repo}&installation_id=${installationId}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloadingRunId(null);
    }
  };

  if (!enabled) {
    return (
      <ToolEmptyState
        title="Workflows Disabled"
        description="Enable the Workflows tool in Settings → Feature Flags to trigger and monitor GitHub Actions."
      />
    );
  }

  return (
    <ToolDrawerPanel toolName="Workflows">
      {loading ? (
        <ToolLoadingState message="Loading workflows..." />
      ) : error ? (
        <ToolErrorState message={error} onRetry={() => loadWorkflows()} />
      ) : (
        <div className="p-3 flex flex-col gap-3">
          {/* Workflow selector + trigger */}
          <div className="flex items-center gap-2">
            <select
              className="input flex-1"
              value={selected ?? ""}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <input
              className="input w-36"
              placeholder="ref (e.g. main)"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={trigger}
              disabled={isDispatching || !selected || actionsDisabled}
              title={actionsDisabled ? "Actions disabled" : "Trigger workflow"}
            >
              {isDispatching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="ml-1">Run</span>
            </Button>
          </div>

          {/* Optional inputs for workflow dispatch */}
          <div className="border border-[var(--border)] rounded p-2">
            <div className="text-xs text-[var(--muted)] mb-2">Inputs (optional)</div>
            {schemaHint.length > 0 && (
              <div className="text-xs text-[var(--muted)] mb-2 flex flex-wrap gap-2">
                <span>Suggested:</span>
                {schemaHint.map((i, idx) => (
                  <span
                    key={idx}
                    className="px-1 py-0.5 rounded border border-[var(--border)] text-[var(--text)]/90"
                    title={`${i.description || "No description"}${i.required ? " (required)" : ""}${
                      i.default ? `\nDefault: ${i.default}` : ""
                    }`}
                  >
                    {i.key}
                    {i.required ? "*" : ""}
                  </span>
                ))}
              </div>
            )}
            {inputs.length === 0 && (
              <div className="text-xs text-[var(--muted)] mb-2">
                No inputs. Add key/value pairs if your workflow expects them.
              </div>
            )}
            <div className="flex flex-col gap-2">
              {inputs.map((row, idx) => {
                const hint = schemaHint.find((h) => h.key === row.key);
                const tooltip = hint
                  ? `${hint.description || "No description"}${hint.required ? " (required)" : ""}${
                      hint.default ? `\nDefault: ${hint.default}` : ""
                    }`
                  : "";
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder="key"
                      value={row.key}
                      title={tooltip}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[idx] = { ...row, key: e.target.value };
                        setInputs(next);
                      }}
                    />
                    <input
                      className="input flex-1"
                      placeholder="value"
                      value={row.value}
                      title={tooltip}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[idx] = { ...row, value: e.target.value };
                        setInputs(next);
                      }}
                    />
                    <button
                      type="button"
                      className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:bg-slate-700/40"
                      onClick={() => setInputs(inputs.filter((_, i) => i !== idx))}
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-2">
              <button
                type="button"
                className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:bg-slate-700/40"
                onClick={() => setInputs([...inputs, { key: "", value: "" }])}
              >
                Add Input
              </button>
            </div>
          </div>

          {/* Run history */}
          <div className="text-xs text-[var(--muted)]">
            {selectedWorkflow ? `${selectedWorkflow.name} – recent runs` : "Select a workflow"}
          </div>

          <div className="flex flex-col gap-2">
            {runs.length === 0 ? (
              <div className="text-sm text-[var(--muted)] p-3 border border-[var(--border)] rounded">
                No runs yet. Trigger the workflow to see history.
              </div>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <WorkflowRunCard run={run} />
                  </div>
                  {run.status === "completed" && run.conclusion !== "success" && (
                    <button
                      type="button"
                      className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:bg-slate-700/40"
                      onClick={() => downloadLogs(run.id)}
                      disabled={downloadingRunId === run.id}
                      title="Download logs"
                    >
                      {downloadingRunId === run.id ? "..." : "Logs"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </ToolDrawerPanel>
  );
}
