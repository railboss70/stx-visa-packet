import { Link } from "@tanstack/react-router";
import { BookOpen, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { StxMark } from "./stx-mark";

export function AppShell({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header
        className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <Link to="/" className="min-w-0">
            <StxMark stacked />
          </Link>
          <div className="flex items-center gap-1">
            {actions}
            <Link
              to="/codes"
              className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink"
              aria-label="Cost codes"
            >
              <BookOpen className="size-4" />
            </Link>
            <Link
              to="/settings"
              className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
      </header>
      <main
        className="mx-auto max-w-6xl py-6"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
