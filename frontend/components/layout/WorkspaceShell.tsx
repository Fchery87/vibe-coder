import type { ReactNode } from "react";

interface WorkspaceShellProps {
  header: ReactNode;
  drawer: ReactNode;
  children: ReactNode;
  commandPalette?: ReactNode;
  settingsModal?: ReactNode;
  toaster?: ReactNode;
  notifications?: ReactNode;
  floatingAction?: ReactNode;
  mainClassName?: string;
  contentClassName?: string;
}

export function WorkspaceShell({
  header,
  drawer,
  children,
  commandPalette,
  settingsModal,
  toaster,
  notifications,
  floatingAction,
  mainClassName,
  contentClassName,
}: WorkspaceShellProps) {
  const contentClasses = ["flex-1 flex flex-col min-h-0", contentClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {header}

      <main
        className={["flex flex-1 min-h-0 gap-[var(--gap-5)] px-4 pb-[var(--gap-5)]", mainClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {drawer}
        <div className={contentClasses}>
          {children}
        </div>
      </main>

      {commandPalette}
      {settingsModal}
      {toaster}
      {notifications}
      {floatingAction}
    </div>
  );
}

export default WorkspaceShell;
