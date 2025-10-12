"use client";

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

interface WorkflowRunCardProps {
  run: {
    id: number;
    name?: string | null;
    status: string | null;
    conclusion: string | null;
    event?: string | null;
    run_number?: number | null;
    head_branch?: string | null;
    head_sha?: string | null;
    html_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    actor?: { login: string; avatar_url?: string };
  };
}

export default function WorkflowRunCard({ run }: WorkflowRunCardProps) {
  const status = run.status || "unknown";
  const conclusion = run.conclusion || undefined;

  const StatusIcon = () => {
    if (status === "queued") return <Clock className="w-4 h-4 text-yellow-400" />;
    if (status === "in_progress") return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    if (status === "completed") {
      if (conclusion === "success") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      return <XCircle className="w-4 h-4 text-red-400" />;
    }
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="border border-[var(--border)] rounded p-3 flex items-start justify-between gap-3 hover:bg-slate-700/20 transition-colors">
      <div className="flex items-start gap-3">
        <StatusIcon />
        <div className="text-sm">
          <div className="text-[var(--text)] font-medium">
            {run.name || `Run #${run.run_number}`}
          </div>
          <div className="text-[var(--muted)]">
            {run.event} • {run.head_branch}
            {run.actor ? ` • by ${run.actor.login}` : ""}
          </div>
        </div>
      </div>
      <div className="text-xs text-[var(--muted)] flex items-center gap-2">
        {run.html_url && (
          <a href={run.html_url} target="_blank" rel="noreferrer" className="link">
            View
          </a>
        )}
      </div>
    </div>
  );
}

