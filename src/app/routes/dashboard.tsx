import { createFileRoute, Link } from '@tanstack/react-router';
import { Clipboard, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { GridBG } from '~/components/background';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { UserMenu } from '~/components/user-menu';
import { useToast } from '~/hooks/use-toast';

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
});

// Mock data for current games
const initialGames = [
  { id: 1, name: 'Game 1', code: 'ABC123', status: 'In Progress' },
  { id: 2, name: 'Game 2', code: 'DEF456', status: 'Waiting' },
  { id: 3, name: 'Game 3', code: 'GHI789', status: 'In Progress' },
];

function RouteComponent() {
  const [currentGames, setCurrentGames] = useState(initialGames);
  const { toast } = useToast();

  const handleDeleteGame = (id: number) => {
    setCurrentGames(currentGames.filter((game) => game.id !== id));
    toast({
      title: 'Game Deleted',
      description: 'The game has been successfully removed.',
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        toast({
          title: 'Code Copied',
          description: 'Game code has been copied to clipboard.',
        });
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        toast({
          title: 'Copy Failed',
          description: 'Failed to copy game code. Please try again.',
          variant: 'destructive',
        });
      });
  };

  return (
    <main className="container min-h-screen w-full flex flex-col p-0">
      <GridBG />
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md">
          <div className="container flex h-16 items-center justify-between px-4">
            <h1 className="text-2xl font-bold">Codenames Dashboard</h1>
            <UserMenu className="bg-card/25" />
          </div>
        </header>
        <main className="container px-4 py-8">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Games</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentGames.map((game) => (
                <Card key={game.id} className="backdrop-blur-sm bg-card/25">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {game.name}
                      <Button
                        className="text-destructive hover:text-destructive group"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGame(game.id)}
                      >
                        <Trash2 className="h-4 w-4 group-hover:brightness-[150%] transition-all" />
                        <span className="sr-only">Delete game</span>
                      </Button>
                    </CardTitle>
                    <CardDescription className="flex justify-between items-center">
                      Game Code: {game.code}
                      <Button variant="ghost" size="icon" onClick={() => handleCopyCode(game.code)}>
                        <Clipboard className="h-4 w-4" />
                        <span className="sr-only">Copy game code</span>
                      </Button>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* <p>Status: {game.status}</p> */}
                    <Button asChild>
                      <Link to={`/game/${game.id}`}>Join Game</Link>
                    </Button>
                  </CardContent>
                  {/* <CardFooter>
                    <Button asChild>
                      <Link to={`/game/${game.id}`}>Join Game</Link>
                    </Button>
                  </CardFooter> */}
                </Card>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4">Add New Bucket</h2>
            <Card className="backdrop-blur-sm bg-card/25">
              <CardHeader>
                <CardTitle>Create a New Word Bucket</CardTitle>
                <CardDescription>Add a new set of words for your Codenames games</CardDescription>
              </CardHeader>
              <CardContent>
                <form>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="bucket-name">Bucket Name</Label>
                      <Input id="bucket-name" placeholder="Enter bucket name" />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="bucket-words">Words (comma-separated)</Label>
                      <Input id="bucket-words" placeholder="Enter words, separated by commas" />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button>Create Bucket</Button>
              </CardFooter>
            </Card>
          </section>
        </main>
      </div>
    </main>
  );
}
