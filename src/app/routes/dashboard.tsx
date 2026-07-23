import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { Clipboard, ExternalLink, Link as LinkIcon, Lock, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { GridBG } from '~/components/background';
import { RoomSettingsDialog } from '~/components/room-settings-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Badge } from '~/components/ui/badge';
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
import { getBuckets } from '~/functions/buckets';
import { deleteRoom, getUserRooms, newGame } from '~/functions/rooms';
import { useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  loader: async () => {
    const [rooms, buckets] = await Promise.all([getUserRooms(), getBuckets()]);
    return { rooms, buckets };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { rooms, buckets } = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();

  const [busyRoom, setBusyRoom] = useState<string | null>(null);

  function copyToClipboard(text: string, what: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: 'Copied', description: `${what} copied to clipboard.` }))
      .catch(() =>
        toast({
          variant: 'destructiveOutline',
          title: 'Copy failed',
          description: 'Please try again.',
        }),
      );
  }

  async function handleNewGame(code: string) {
    setBusyRoom(code);
    try {
      await newGame({ data: { code } });
      toast({ title: 'New game dealt', description: `A fresh board was dealt in ${code}.` });
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not start a new game',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setBusyRoom(null);
    }
  }

  async function handleDeleteRoom(roomId: string, code: string) {
    try {
      await deleteRoom({ data: { roomId } });
      await router.invalidate();
      toast({ title: 'Room deleted', description: `${code} was deleted and its code freed.` });
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not delete room',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    }
  }

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Rooms</h2>
              <Button asChild>
                <Link to="/create">
                  <Plus className="h-4 w-4" /> Create Room
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room.id} className="backdrop-blur-sm bg-card/25">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span className="flex items-center gap-2 font-mono text-xl">
                        {room.code}
                        {room.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </span>
                      <span className="flex">
                        <RoomSettingsDialog room={room} buckets={buckets} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              className="text-destructive hover:text-destructive group"
                              variant="ghost"
                              size="icon"
                            >
                              <Trash2 className="h-4 w-4 group-hover:brightness-[150%] transition-all" />
                              <span className="sr-only">Delete room</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {room.code}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Anyone currently playing will be disconnected and the room code will
                                be freed. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDeleteRoom(room.id, room.code)}
                              >
                                Delete Room
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Game {room.deal} · {room.buckets.map((bucket) => bucket.name).join(', ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link to="/game/$code" params={{ code: room.code }}>
                        <ExternalLink className="h-4 w-4" /> Open
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleNewGame(room.code)}
                      disabled={busyRoom === room.code}
                    >
                      <RefreshCw className="h-4 w-4" /> New Game
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(`${window.location.origin}/game/${room.code}`, 'Room link')
                      }
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span className="sr-only">Copy room link</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(room.code, 'Room code')}
                    >
                      <Clipboard className="h-4 w-4" />
                      <span className="sr-only">Copy room code</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {rooms.length === 0 && (
                <Card className="backdrop-blur-sm bg-card/25 md:col-span-2 lg:col-span-3">
                  <CardHeader>
                    <CardTitle>No rooms yet</CardTitle>
                    <CardDescription>
                      Create a room to get a shareable code your friends can join at any time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <Link to="/create">
                        <Plus className="h-4 w-4" /> Create your first room
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
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
