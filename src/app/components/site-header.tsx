import { Link } from '@tanstack/react-router';
import { Button } from '~/components/ui/button';
import { UserMenu } from '~/components/user-menu';
import { cn } from '~/lib/utils';

export function SiteHeader({
  className,
  sticky = false,
  code,
  actions,
}: {
  className?: string;
  sticky?: boolean;
  /** Mono room code shown beside the wordmark; on mobile it replaces the wordmark text. */
  code?: string;
  /** Replaces the default nav links; UserMenu always renders last. */
  actions?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        'w-full',
        sticky && 'sticky top-0 z-40 border-b bg-background/30 backdrop-blur-md',
        className,
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex gap-1" aria-hidden>
              <div className="size-2.5 rounded-[3px] bg-card-red" />
              <div className="size-2.5 rounded-[3px] bg-card-bystander" />
              <div className="size-2.5 rounded-[3px] bg-card-blue" />
            </div>
            <span
              className={cn(
                'font-display text-xl font-bold uppercase tracking-wide',
                code && 'hidden sm:inline',
              )}
            >
              Codenames
            </span>
          </Link>
          {code && <span className="font-mono text-sm text-muted-foreground">{code}</span>}
        </div>
        <nav className="flex items-center gap-1.5">
          {actions ?? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/how-to-play" activeProps={{ className: 'bg-accent' }}>
                  How to play
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/dashboard" activeProps={{ className: 'bg-accent' }}>
                  Dashboard
                </Link>
              </Button>
            </>
          )}
          <UserMenu dashboardMobileOnly={!actions} />
        </nav>
      </div>
    </header>
  );
}
