import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import {
  Clipboard,
  Download,
  ExternalLink,
  Link as LinkIcon,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { GridBG } from '~/components/background';
import { BucketFormDialog, BucketImportDialog, exportBucket } from '~/components/bucket-dialogs';
import { MotionProvider, m, riseItem, staggerParent } from '~/components/motion';
import { PageHeading } from '~/components/page-heading';
import { RoomSettingsDialog } from '~/components/room-settings-dialog';
import { SiteHeader } from '~/components/site-header';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { deleteBucket, getBuckets } from '~/functions/buckets';
import { deleteRoom, getUserRooms, newGame } from '~/functions/rooms';
import { useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';
import { MODE_INFO } from '~/lib/modes';

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
  head: () => ({ meta: [{ title: 'Dashboard — Codenames' }] }),
  component: RouteComponent,
});

const cardStyle =
  'backdrop-blur-sm bg-card/25 h-full transition-all hover:-translate-y-0.5 hover:border-primary/50';
const sectionTitleStyle = 'font-display text-2xl font-bold uppercase tracking-wide';

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

  async function handleDeleteBucket(bucketId: string, name: string) {
    try {
      await deleteBucket({ data: { id: bucketId } });
      await router.invalidate();
      toast({ title: 'Bucket deleted', description: `${name} was deleted.` });
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not delete bucket',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
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
    <MotionProvider>
      <div className="min-h-screen flex flex-col">
        <GridBG />
        <SiteHeader sticky />
        <main className="container mx-auto w-full px-4 py-8">
          <m.div variants={staggerParent} initial="hidden" animate="show" className="space-y-10">
            <PageHeading eyebrow="// Field operations" title="Dashboard" />
            <m.section variants={staggerParent} className="space-y-4">
              <m.div variants={riseItem} className="flex items-center justify-between">
                <h2 className={sectionTitleStyle}>Your Rooms</h2>
                <Button asChild>
                  <Link to="/create">
                    <Plus className="h-4 w-4" /> Create Room
                  </Link>
                </Button>
              </m.div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <m.div key={room.id} variants={riseItem} className="h-full">
                    <Card className={cardStyle}>
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
                                    Anyone currently playing will be disconnected and the room code
                                    will be freed. This cannot be undone.
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
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="secondary">{MODE_INFO[room.mode].label}</Badge>
                          <span>
                            Game {room.deal} ·{' '}
                            {room.buckets.map((bucket) => bucket.name).join(', ')}
                          </span>
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
                            copyToClipboard(
                              `${window.location.origin}/game/${room.code}`,
                              'Room link',
                            )
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
                  </m.div>
                ))}
                {rooms.length === 0 && (
                  <m.div variants={riseItem} className="md:col-span-2 lg:col-span-3">
                    <Card className="backdrop-blur-sm bg-card/25">
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
                  </m.div>
                )}
              </div>
            </m.section>
            <m.section variants={staggerParent} className="space-y-4">
              <m.div variants={riseItem} className="flex items-center justify-between">
                <h2 className={sectionTitleStyle}>Word Buckets</h2>
                <div className="flex gap-2">
                  <BucketImportDialog
                    trigger={
                      <Button variant="outline">
                        <Upload className="h-4 w-4" /> Import
                      </Button>
                    }
                  />
                  <BucketFormDialog
                    trigger={
                      <Button>
                        <Plus className="h-4 w-4" /> New Bucket
                      </Button>
                    }
                  />
                </div>
              </m.div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {buckets.map((bucket) => (
                  <m.div key={bucket.id} variants={riseItem} className="h-full">
                    <Card className={cardStyle}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center text-xl">
                          {bucket.name}
                          {bucket.isSystem && <Badge variant="outline">System</Badge>}
                        </CardTitle>
                        <CardDescription>
                          {bucket.words.length} words
                          {bucket.description ? ` · ${bucket.description}` : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        {!bucket.isSystem && (
                          <BucketFormDialog
                            bucket={bucket}
                            trigger={
                              <Button variant="outline">
                                <Pencil className="h-4 w-4" /> Edit
                              </Button>
                            }
                          />
                        )}
                        <Button variant="outline" onClick={() => exportBucket(bucket)}>
                          <Download className="h-4 w-4" /> Export
                        </Button>
                        {!bucket.isSystem && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                className="text-destructive hover:text-destructive group"
                                variant="ghost"
                                size="icon"
                              >
                                <Trash2 className="h-4 w-4 group-hover:brightness-[150%] transition-all" />
                                <span className="sr-only">Delete bucket</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {bucket.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Rooms using this bucket keep their current board, but new games
                                  will need enough words from their remaining buckets. This cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteBucket(bucket.id, bucket.name)}
                                >
                                  Delete Bucket
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </CardContent>
                    </Card>
                  </m.div>
                ))}
              </div>
            </m.section>
          </m.div>
        </main>
      </div>
    </MotionProvider>
  );
}
