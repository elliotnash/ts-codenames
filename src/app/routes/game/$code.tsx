import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { LoaderIcon, Lock, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { match } from 'ts-pattern';
import { GradientBG, GridBG } from '~/components/background';
import { ClassicBoard } from '~/components/game/classic-board';
import { DuetBoard } from '~/components/game/duet-board';
import { DuetSidePicker } from '~/components/game/duet-side-picker';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { UserMenu } from '~/components/user-menu';
import { getRoom, newGame, submitRoomPassword } from '~/functions/rooms';
import { useDuetSide } from '~/hooks/use-duet-side';
import { useRoomStream } from '~/hooks/use-room-stream';
import { useToast } from '~/hooks/use-toast';
import type { GameState } from '~/lib/room-events';

export const Route = createFileRoute('/game/$code')({
  loader: ({ params }) => getRoom({ data: { code: params.code } }),
  component: GamePage,
  notFoundComponent: () => (
    <MessageCard title="Room not found" description="There is no room with this code.">
      <Button asChild className="w-full">
        <Link to="/">Back to Home</Link>
      </Button>
    </MessageCard>
  ),
});

function GamePage() {
  const data = Route.useLoaderData();
  if (data.status === 'needsPassword') {
    return <PasswordGate code={data.code} />;
  }
  return <GameRoom key={data.room.code} code={data.room.code} initial={data.room.state} />;
}

function MessageCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <GridBG />
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm backdrop-blur-sm bg-card/25">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
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
        <Card className="w-full max-w-sm backdrop-blur-sm bg-card/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> This room is locked
            </CardTitle>
            <CardDescription>
              Enter the password to join <span className="font-mono">{code}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room-password">Password</Label>
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
      </div>
    </div>
  );
}

function GameRoom({ code, initial }: { code: string; initial: GameState }) {
  const { toast } = useToast();
  const [state, setState] = useState<GameState>(initial);
  const [roomDeleted, setRoomDeleted] = useState(false);
  // The stored side always rides on the stream URL (even for classic rooms), so
  // a live switch to duet delivers this viewer's key without a reconnect dance.
  const [side, setSide] = useDuetSide(code);

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
      <MessageCard title="Room deleted" description="This room was deleted by its owner.">
        <Button asChild className="w-full">
          <Link to="/">Back to Home</Link>
        </Button>
      </MessageCard>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <GradientBG />
      <div className="flex justify-between items-center m-6 px-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-4xl font-bold">Codenames</h1>
          <span className="text-muted-foreground font-mono hidden sm:inline">{code}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleNewGame} disabled={dealing}>
            {dealing ? <LoaderIcon className="animate-spin-slow" /> : <RefreshCw />}
            New Game
          </Button>
          <UserMenu />
        </div>
      </div>
      {match(state)
        .with({ mode: 'classic' }, (classic) => (
          <ClassicBoard code={code} state={classic} setState={setState} />
        ))
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
