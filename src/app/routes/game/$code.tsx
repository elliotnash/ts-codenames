import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { LoaderIcon, Lock, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { match } from 'ts-pattern';
import { GradientBG, GridBG } from '~/components/background';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { UserMenu } from '~/components/user-menu';
import { getRoom, newGame, revealCard, submitRoomPassword } from '~/functions/rooms';
import { useToast } from '~/hooks/use-toast';
import { type Category, ServerEventSchema, type Team } from '~/lib/room-events';
import { cn } from '~/lib/utils';

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
  return <GameBoard key={data.room.code} initial={data.room} />;
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

type BoardState = {
  deal: number;
  startingTeam: Team;
  words: string[];
  categories: Category[];
  revealed: Set<number>;
};

function GameBoard({
  initial,
}: {
  initial: {
    code: string;
    deal: number;
    startingTeam: Team;
    words: string[];
    categories: Category[];
    revealed: number[];
  };
}) {
  const { toast } = useToast();
  const code = initial.code;

  const [board, setBoard] = useState<BoardState>(() => ({
    deal: initial.deal,
    startingTeam: initial.startingTeam,
    words: initial.words,
    categories: initial.categories,
    revealed: new Set(initial.revealed),
  }));
  const [roomDeleted, setRoomDeleted] = useState(false);

  // Receive board updates over Server-Sent Events.
  useEffect(() => {
    const source = new EventSource(`/api/rooms/${code}/events`);
    source.addEventListener('message', (event) => {
      try {
        const { data } = ServerEventSchema.safeParse(JSON.parse(event.data));
        if (!data) return;
        match(data)
          .with({ type: 'fullState' }, (state) => {
            setBoard({
              deal: state.deal,
              startingTeam: state.startingTeam,
              words: state.words,
              categories: state.categories,
              revealed: new Set(state.revealed),
            });
          })
          .with({ type: 'revealedUpdate' }, (update) => {
            setBoard((board) =>
              // Ignore reveal updates from a previous deal.
              board.deal === update.deal ? { ...board, revealed: new Set(update.revealed) } : board,
            );
          })
          .with({ type: 'roomDeleted' }, () => {
            source.close();
            setRoomDeleted(true);
          })
          .exhaustive();
      } catch (e) {
        console.log("Couldn't parse SSE message:", event.data);
      }
    });
    return () => source.close();
  }, [code]);

  function handleReveal(index: number) {
    if (board.revealed.has(index)) return;
    const deal = board.deal;
    setBoard((board) => ({ ...board, revealed: new Set([...board.revealed, index]) }));
    revealCard({ data: { code, card: index, deal } }).catch(() => {
      // The next SSE update reconciles state if the reveal didn't land.
    });
  }

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

  const { words, categories } = board;

  const blueStart = useMemo(() => categories.filter((cat) => cat === 'blue').length, [categories]);

  const redStart = useMemo(() => categories.filter((cat) => cat === 'red').length, [categories]);

  const blueScore = useMemo(
    () => blueStart - [...board.revealed].filter((card) => categories[card] === 'blue').length,
    [categories, board.revealed, blueStart],
  );

  const redScore = useMemo(
    () => redStart - [...board.revealed].filter((card) => categories[card] === 'red').length,
    [categories, board.revealed, redStart],
  );

  // Spymaster toggle
  const [isSpymaster, setIsSpymaster] = useState(false);

  if (roomDeleted) {
    return (
      <MessageCard title="Room deleted" description="This room was deleted by its owner.">
        <Button asChild className="w-full">
          <Link to="/">Back to Home</Link>
        </Button>
      </MessageCard>
    );
  }

  const scoreBadges = [
    <Badge key="badge-red" variant="secondary" className="text-card-red">
      Red: {redScore}
    </Badge>,
    <Badge key="badge-blue" variant="secondary" className="text-card-blue">
      Blue: {blueScore}
    </Badge>,
  ];

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
      <div className="grow flex justify-center flex-col m-auto w-full px-6 max-w-4xl max-h-full">
        <div className="flex justify-between w-full mb-6 px-4">
          <div className="flex space-x-4">
            {board.startingTeam === 'red' ? scoreBadges : scoreBadges.reverse()}
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="spymaster-mode" checked={isSpymaster} onCheckedChange={setIsSpymaster} />
            <Label htmlFor="spymaster-mode">Spymaster Mode</Label>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 w-full px-4">
          {words.map((word, i) => (
            <GameCard
              onClick={() => handleReveal(i)}
              category={categories[i]!}
              key={`${board.deal}-${word}`}
              spymaster={isSpymaster}
              revealed={board.revealed.has(i)}
            >
              {word}
            </GameCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const cardCategoryVariants = cva('', {
  variants: {
    variant: {
      red: 'bg-card-red text-card-red-foreground hover:bg-card-red/85',
      blue: 'bg-card-blue text-card-blue-foreground hover:bg-card-blue/85',
      bystander: 'bg-card-bystander text-card-bystander-foreground hover:bg-card-bystander/85',
      death: 'bg-card-death text-card-death-foreground hover:bg-card-death/85',
    },
  },
});

const cardSpymasterVariants = cva('', {
  variants: {
    variant: {
      red: 'border-card-red text-card-red',
      blue: 'border-card-blue text-card-blue',
      bystander: 'border-card-bystander text-card-bystander-foreground',
      death: 'ring-4 ring-card-death border-card-death text-card-death',
    },
  },
});

function GameCard({
  children,
  category,
  revealed,
  spymaster,
  onClick,
}: {
  children: string;
  category: Category;
  spymaster: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  const baseStyle =
    'aspect-[4/3] flex items-center justify-center cursor-pointer hover:bg-accent transition-all';
  return (
    <div className="perspective-[1000px] cursor-pointer">
      <div
        data-revealed={revealed}
        className="relative transform-3d transition-transform duration-700 text-white data-[revealed=true]:rotate-y-180"
      >
        <div className="backface-hidden w-full h-full inset-0 rotate-y-0">
          <Card
            onClick={onClick}
            className={cn(
              baseStyle,
              cardCategoryVariants(),
              spymaster && cardSpymasterVariants({ variant: category }),
            )}
          >
            <CardContent className="text-center p-0">{children.toUpperCase()}</CardContent>
          </Card>
        </div>
        <div className="backface-hidden absolute w-full h-full inset-0 rotate-y-180">
          <Card
            onClick={onClick}
            className={cn(baseStyle, cardCategoryVariants({ variant: category }))}
          >
            <CardContent className="text-center p-0">{children.toUpperCase()}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
