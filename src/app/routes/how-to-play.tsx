import { createFileRoute, Link } from '@tanstack/react-router';
import { GridBG } from '~/components/background';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';

export const Route = createFileRoute('/how-to-play')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
      <GridBG />
      <h1 className="text-4xl font-bold mb-6">How to Play Codenames</h1>

      <div className="max-w-2xl text-center space-y-4 mb-8">
        <p>1. Players split into two teams: red and blue.</p>
        <p>2. Each team selects a Spymaster who gives one-word clues.</p>
        <p>
          3. Teams take turns guessing which word cards on the table belong to their team based on
          the clue.
        </p>
        <p>4. First team to identify all their agents (words) wins!</p>
      </div>

      <div className="flex items-center space-x-4">
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <Button asChild variant="outline">
          <Link to="/login">Log In to Play</Link>
        </Button>
      </div>
    </main>
  );
}
