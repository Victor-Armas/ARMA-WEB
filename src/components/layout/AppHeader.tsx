import { SignOutButton } from "@/features/auth/components/SignOutButton";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 hidden min-h-15 items-center justify-end gap-8 border-b border-arma-border bg-arma-surface px-8 py-2 desktop:col-start-2 desktop:row-start-1 desktop:flex">
      <span className="text-xs font-medium tracking-wide text-arma-muted">
        CONTROL INTERNO
      </span>
      <SignOutButton />
    </header>
  );
}
