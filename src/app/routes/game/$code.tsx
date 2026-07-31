import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { LoaderIcon, Lock, RefreshCw, Skull } from 'lucide-react';
import { useState } from 'react';
import { match } from 'ts-pattern';
import { GradientBG, GridBG } from '~/components/background';
import { AutoFlipTile, ErrorScreen } from '~/components/error-card';
import { ClassicBoard } from '~/components/game/classic-board';
import { ClassicRolePicker } from '~/components/game/classic-role-picker';
import { DuetBoard } from '~/components/game/duet-board';
import { DuetSidePicker } from '~/components/game/duet-side-picker';
import { MotionProvider, m, riseItem } from '~/components/motion';
import { RoomSettingsDialog } from '~/components/room-settings-dialog';
import { SiteHeader } from '~/components/site-header';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { type Bucket, getBuckets } from '~/functions/buckets';
import { getRoom, newGame, submitRoomPassword } from '~/functions/rooms';
import { useCookieState } from '~/hooks/use-cookie-state';
import { useRoomStream } from '~/hooks/use-room-stream';
import { useToast } from '~/hooks/use-toast';
import type { DuetSide, GameState } from '~/lib/room-events';
import {
  type ClassicRole,
  classicRoleCookieName,
  duetSideCookieName,
} from '~/lib/room-view-cookies';

export const Route = createFileRoute('/game/$code')({
  loader: async ({ params }) => {
    const data = await getRoom({ data: { code: params.code } });
    // Owners get the room-settings dialog, which needs the bucket list.
    const buckets = data.status === 'ok' && data.room.isOwner ? await getBuckets() : null;
    return { data, buckets };
  },
  head: ({ params }) => ({ meta: [{ title: `${params.code} — Codenames` }] }),
  component: GamePage,
  notFoundComponent: RoomNotFound,
});

function RoomNotFound() {
  const { code } = Route.useParams();
  return (
    <ErrorScreen
      eyebrow="// Transmission lost"
      title="Room not found"
      code={code}
      description="No room answers at this code. It may have been deleted, or the code was mistyped."
      tile={
        <AutoFlipTile variant="death">
          <Skull className="size-5" />
        </AutoFlipTile>
      }
    >
      <Button asChild className="w-full">
        <Link to="/">Back to home</Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link to="/dashboard">Open dashboard</Link>
      </Button>
    </ErrorScreen>
  );
}

function GamePage() {
  const { data, buckets } = Route.useLoaderData();
  return (
    <MotionProvider>
      {data.status === 'needsPassword' ? (
        <PasswordGate code={data.code} />
      ) : (
        <GameRoom
          key={data.room.code}
          code={data.room.code}
          initial={data.room}
          buckets={buckets}
        />
      )}
    </MotionProvider>
  );
}

function PasswordGate({ code }: { code: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitRoomPassword({ data: { code, password } });
      if (result.ok) {
        await router.invalidate();
      } else {
        toast({
          variant: 'destructiveOutline',
          title: 'Incorrect password',
          description: 'Please check with the room owner and try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <GridBG />
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <m.div variants={riseItem} initial="hidden" animate="show" className="w-full max-w-sm">
          <Card className="backdrop-blur-sm bg-card/25">
            <CardHeader>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">
                {'// Restricted'}
              </p>
              <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
                <Lock className="h-5 w-5" /> This room is locked
              </CardTitle>
              <CardDescription>
                Enter the password to join <span className="font-mono">{code}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="room-password" className="block pb-1">
                    Password
                  </Label>
                  <Input
                    id="room-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <LoaderIcon className="animate-spin-slow" />}
                  Enter Room
                </Button>
              </form>
            </CardContent>
          </Card>
        </m.div>
      </div>
    </div>
  );
}

function GameRoom({
  code,
  initial,
  buckets,
}: {
  code: string;
  initial: {
    id: string;
    state: GameState;
    duetSide: DuetSide | null;
    classicRole: ClassicRole | null;
    isOwner: boolean;
    hasPassword: boolean;
    bucketIds: string[];
  };
  buckets: Bucket[] | null;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<GameState>(initial.state);
  const [roomDeleted, setRoomDeleted] = useState(false);
  // The declared side always rides on the stream URL (even for classic rooms),
  // so a live switch to duet delivers this viewer's key without a reconnect dance.
  const [side, setSide] = useCookieState<DuetSide>(duetSideCookieName(code), initial.duetSide);
  const [role, setRole] = useCookieState<ClassicRole>(
    classicRoleCookieName(code),
    initial.classicRole,
  );

  useRoomStream(code, side, !roomDeleted, (event) => {
    match(event)
      .with({ type: 'fullState' }, (full) => setState(full.state))
      .with({ type: 'revealedUpdate' }, (update) => {
        setState((prev) =>
          // Ignore updates from a previous deal.
          prev.mode === 'classic' && prev.deal === update.deal
            ? { ...prev, revealed: update.revealed }
            : prev,
        );
      })
      .with({ type: 'duetUpdate' }, (update) => {
        setState((prev) =>
          prev.mode === 'duet' && prev.deal === update.deal ? { ...prev, duet: update.duet } : prev,
        );
      })
      .with({ type: 'roomDeleted' }, () => setRoomDeleted(true))
      .exhaustive();
  });

  const [dealing, setDealing] = useState(false);

  async function handleNewGame() {
    setDealing(true);
    try {
      await newGame({ data: { code } });
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not start a new game',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setDealing(false);
    }
  }

  if (roomDeleted) {
    return (
      <ErrorScreen
        eyebrow="// Room closed"
        title="Room deleted"
        code={code}
        description="The owner deleted this room. Create a new one from your dashboard."
        tile={<AutoFlipTile variant="bystander" />}
      >
        <Button asChild className="w-full">
          <Link to="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link to="/dashboard">Open dashboard</Link>
        </Button>
      </ErrorScreen>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <GradientBG />
      <SiteHeader
        sticky
        code={code}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={handleNewGame} disabled={dealing}>
              {dealing ? <LoaderIcon className="animate-spin-slow" /> : <RefreshCw />}
              <span className="hidden sm:inline">New Game</span>
            </Button>
            {initial.isOwner && buckets && (
              <RoomSettingsDialog
                room={{
                  id: initial.id,
                  code,
                  hasPassword: initial.hasPassword,
                  mode: state.mode,
                  buckets: initial.bucketIds.map((id) => ({ id })),
                }}
                buckets={buckets}
              />
            )}
          </>
        }
      />
      {match(state)
        .with({ mode: 'classic' }, (classic) =>
          role === null ? (
            <ClassicRolePicker onPick={setRole} />
          ) : (
            <ClassicBoard
              code={code}
              state={classic}
              setState={setState}
              role={role}
              onSwitchRole={() => setRole(null)}
            />
          ),
        )
        .with({ mode: 'duet' }, (duet) =>
          side === null ? (
            <DuetSidePicker duet={duet.duet} onPick={setSide} />
          ) : duet.key === null || duet.side !== side ? (
            <div className="grow flex items-center justify-center p-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LoaderIcon className="animate-spin-slow" /> Dealing you in…
              </div>
            </div>
          ) : (
            <DuetBoard
              code={code}
              state={duet}
              side={side}
              ownKey={duet.key}
              onSwitchSide={() => setSide(null)}
            />
          ),
        )
        .exhaustive()}
    </div>
  );
}
