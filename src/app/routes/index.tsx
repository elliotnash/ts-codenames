import { createFileRoute, Link } from '@tanstack/react-router';
import { GridBG } from '~/components/background';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { useAuth } from '~/hooks/use-auth';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();

  return (
    <main className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
      <GridBG />

      <h1 className="text-4xl font-bold mb-6">Welcome to Codenames</h1>

      <p className="text-xl mb-8 text-center max-w-2xl">
        Codenames: A thrilling word-guessing game where two teams compete to uncover secret agents
        using one-word clues.
      </p>

      <div className="flex items-center space-x-4 mb-8">
        <Button asChild>
          <Link to="/dashboard">Create a game</Link>
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <Button asChild variant="outline">
          <Link to="/how-to-play">How to Play</Link>
        </Button>
      </div>

      {!auth.isAuthenticated && (
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="underline transition-colors hover:text-foreground">
            Log in
          </Link>{' '}
          or{' '}
          <Link to="/register" className="underline transition-colors hover:text-foreground">
            register
          </Link>{' '}
          to create a game
        </p>
      )}
    </main>
  );
}
