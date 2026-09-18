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
      <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="min-w-0">
            <StxMark stacked />
          </Link>
          <div className="flex items-center gap-1">
            {actions}
            <Link
              to="/codes"
              className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink"
              aria-label="Cost codes"
            >
              <BookOpen className="size-4" />
            </Link>
            <Link
              to="/settings"
              className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
