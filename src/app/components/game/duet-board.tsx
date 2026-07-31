import { cva } from 'class-variance-authority';
import { ArrowLeftRight, Hourglass, LoaderIcon, Skull } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FlipCard, cardBaseStyle } from '~/components/game/flip-card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { duetGuess, endDuetTurn, newGame } from '~/functions/rooms';
import { useToast } from '~/hooks/use-toast';
import { DUET_TOKENS, DUET_TOTAL_AGENTS } from '~/lib/modes';
import type { DuetCard, DuetSide, DuetState } from '~/lib/room-events';
import { cn } from '~/lib/utils';

export function DuetBoard({
  code,
  state,
  side,
  ownKey,
  onSwitchSide,
}: {
  code: string;
  state: DuetState;
  side: DuetSide;
  ownKey: DuetCard[];
  onSwitchSide: () => void;
}) {
  const { toast } = useToast();
  const duet = state.duet;

  const agents = useMemo(() => new Set(duet.agents), [duet.agents]);
  const marksA = useMemo(() => new Set(duet.bystandersA), [duet.bystandersA]);
  const marksB = useMemo(() => new Set(duet.bystandersB), [duet.bystandersB]);
  const myMarks = side === 'a' ? marksA : marksB;

  const gameOver = duet.status !== 'playing';
  const suddenDeath = !gameOver && duet.tokens === 0;

  // The card that lost the game, resolved against the key it was guessed on.
  const fatalIdentity = useMemo(() => {
    if (duet.status !== 'lost' || duet.fatalCard === null || !duet.keyA || !duet.keyB) return null;
    return duet.fatalSide === 'a' ? duet.keyB[duet.fatalCard]! : duet.keyA[duet.fatalCard]!;
  }, [duet]);

  // A tapped card waiting on the server; blocks further taps until resolved.
  const [pending, setPending] = useState<number | null>(null);

  function handleGuess(index: number) {
    if (pending !== null || gameOver || agents.has(index) || myMarks.has(index)) return;
    setPending(index);
    duetGuess({ data: { code, card: index, side, deal: state.deal } })
      .catch(() => {})
      .finally(() => setPending(null));
  }

  const [ending, setEnding] = useState(false);
  async function handleEndTurn() {
    setEnding(true);
    try {
      await endDuetTurn({ data: { code, deal: state.deal } });
    } finally {
      setEnding(false);
    }
  }

  const [resultDismissed, setResultDismissed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when a new game is dealt
  useEffect(() => setResultDismissed(false), [state.deal]);

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

  const fatalWord = duet.fatalCard !== null ? state.words[duet.fatalCard] : null;
  const resultMessage =
    duet.status === 'won'
      ? duet.tokens > 0
        ? `All ${DUET_TOTAL_AGENTS} agents contacted with ${duet.tokens} ${duet.tokens === 1 ? 'turn' : 'turns'} to spare.`
        : `All ${DUET_TOTAL_AGENTS} agents contacted just in time.`
      : fatalIdentity === 'assassin'
        ? `Player ${duet.fatalSide?.toUpperCase()} contacted the assassin on ${fatalWord?.toUpperCase()}.`
        : fatalWord
          ? `Out of time — ${fatalWord.toUpperCase()} was an innocent bystander.`
          : 'The mission failed.';

  return (
    <div className="grow flex justify-center flex-col m-auto w-full px-6 max-w-4xl max-h-full">
      <div className="flex justify-between items-center gap-3 flex-wrap w-full mb-6 px-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-card-agent">
            Agents: {duet.agents.length}/{DUET_TOTAL_AGENTS}
          </Badge>
          <TokenPips tokens={duet.tokens} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Player {side.toUpperCase()}</Badge>
          <Button variant="ghost" size="sm" onClick={onSwitchSide}>
            <ArrowLeftRight /> Switch side
          </Button>
          {gameOver ? (
            <Button variant="outline" size="sm" onClick={() => setResultDismissed(false)}>
              Show result
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndTurn}
              disabled={ending || suddenDeath}
            >
              {ending ? <LoaderIcon className="animate-spin-slow" /> : <Hourglass />}
              End Turn
            </Button>
          )}
        </div>
      </div>

      {suddenDeath && (
        <div className="mb-6 mx-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-2 text-center">
          Sudden death — no more clues. Any wrong guess loses the game.
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 w-full px-4">
        {state.words.map((word, i) => (
          <DuetGameCard
            key={`${state.deal}-${word}`}
            word={word}
            ownCard={ownKey[i]!}
            flipCategory={
              agents.has(i)
                ? 'agent'
                : duet.status === 'lost' && duet.fatalCard === i
                  ? fatalIdentity === 'assassin'
                    ? 'death'
                    : 'bystander'
                  : marksA.has(i) && marksB.has(i)
                    ? 'bystander'
                    : null
            }
            marks={{ a: marksA.has(i), b: marksB.has(i) }}
            pending={pending === i}
            keyPair={duet.keyA && duet.keyB ? [duet.keyA[i]!, duet.keyB[i]!] : null}
            onClick={() => handleGuess(i)}
          />
        ))}
      </div>

      {gameOver && !resultDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-6">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="text-2xl">
                {duet.status === 'won' ? 'Mission complete' : 'Mission failed'}
              </CardTitle>
              <CardDescription className="text-balance">{resultMessage}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-2">
              <Button onClick={handleNewGame} disabled={dealing}>
                {dealing && <LoaderIcon className="animate-spin-slow" />}
                New Game
              </Button>
              <Button variant="outline" onClick={() => setResultDismissed(true)}>
                View Board
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TokenPips({ tokens }: { tokens: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      title={`${tokens} ${tokens === 1 ? 'turn' : 'turns'} left`}
    >
      {Array.from({ length: DUET_TOKENS }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size static list
          key={i}
          className={cn(
            'size-2.5 rounded-full bg-primary transition-all duration-500',
            i >= tokens && 'scale-0 opacity-0',
          )}
        />
      ))}
    </div>
  );
}

// Own-key overlay on the front (unrevealed) face — the viewer is always spymaster
// for their side, so this is always visible.
const duetKeyVariants = cva('', {
  variants: {
    variant: {
      agent: 'border-card-agent ring-2 ring-card-agent/60 text-card-agent',
      assassin: 'ring-4 ring-card-death border-card-death text-card-death',
      bystander: '',
    },
  },
});

const duetBackVariants = cva('', {
  variants: {
    variant: {
      agent: 'bg-card-agent text-card-agent-foreground hover:bg-card-agent/85',
      bystander: 'bg-card-bystander text-card-bystander-foreground hover:bg-card-bystander/85',
      death: 'bg-card-death text-card-death-foreground hover:bg-card-death/85',
    },
  },
});

const keyStripVariants = cva('flex-1', {
  variants: {
    variant: {
      agent: 'bg-card-agent',
      assassin: 'bg-card-death',
      bystander: 'bg-card-bystander',
    },
  },
});

function DuetGameCard({
  word,
  ownCard,
  flipCategory,
  marks,
  pending,
  keyPair,
  onClick,
}: {
  word: string;
  ownCard: DuetCard;
  flipCategory: 'agent' | 'bystander' | 'death' | null;
  marks: { a: boolean; b: boolean };
  pending: boolean;
  // Both key entries for this card, public once the game is over.
  keyPair: [DuetCard, DuetCard] | null;
  onClick: () => void;
}) {
  return (
    <FlipCard
      flipped={flipCategory !== null}
      front={
        <Card
          onClick={onClick}
          title={keyPair ? `A: ${keyPair[0]} · B: ${keyPair[1]}` : undefined}
          className={cn(
            cardBaseStyle,
            'relative',
            duetKeyVariants({ variant: ownCard }),
            pending && 'animate-pulse',
          )}
        >
          <CardContent className="text-center p-0">{word.toUpperCase()}</CardContent>
          {(marks.a || marks.b) && (
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              {marks.a && <MarkChip side="a" />}
              {marks.b && <MarkChip side="b" />}
            </div>
          )}
          {ownCard === 'assassin' && !keyPair && (
            <Skull className="absolute bottom-1.5 right-1.5 size-3.5 opacity-70" />
          )}
          {keyPair && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 flex overflow-hidden rounded-b-lg">
              <div className={keyStripVariants({ variant: keyPair[0] })} />
              <div className={keyStripVariants({ variant: keyPair[1] })} />
            </div>
          )}
        </Card>
      }
      back={
        <Card
          onClick={onClick}
          className={cn(
            cardBaseStyle,
            'relative',
            flipCategory && duetBackVariants({ variant: flipCategory }),
          )}
        >
          <CardContent className="text-center p-0">{word.toUpperCase()}</CardContent>
          {flipCategory === 'bystander' && (marks.a || marks.b) && (
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              {marks.a && <MarkChip side="a" />}
              {marks.b && <MarkChip side="b" />}
            </div>
          )}
        </Card>
      }
    />
  );
}

/** Timer-token mark left by a side's bystander guess (the arrow points at the guesser). */
function MarkChip({ side }: { side: DuetSide }) {
  return (
    <span className="flex size-5 items-center justify-center rounded-sm bg-card-bystander text-card-bystander-foreground text-[10px] font-bold shadow-sm">
      {side.toUpperCase()}
    </span>
  );
}
