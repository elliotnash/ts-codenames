import { Link } from '@tanstack/react-router';
import { Button } from '~/components/ui/button';
import { UserMenu } from '~/components/user-menu';
import { cn } from '~/lib/utils';

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn('w-full', className)}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex gap-1" aria-hidden>
            <div className="size-2.5 rounded-[3px] bg-card-red" />
            <div className="size-2.5 rounded-[3px] bg-card-bystander" />
            <div className="size-2.5 rounded-[3px] bg-card-blue" />
          </div>
          <span className="font-display text-xl font-bold uppercase tracking-wide">Codenames</span>
        </Link>
        <nav className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link to="/how-to-play" activeProps={{ className: 'bg-accent' }}>
              How to play
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
