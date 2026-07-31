import { cva } from 'class-variance-authority';
import { ArrowLeftRight, Skull } from 'lucide-react';
import { useMemo } from 'react';
import { FlipCard, cardBaseStyle } from '~/components/game/flip-card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { revealCard } from '~/functions/rooms';
import type { Category, ClassicState, GameState } from '~/lib/room-events';
import type { ClassicRole } from '~/lib/room-view-cookies';
import { cn } from '~/lib/utils';

export function ClassicBoard({
  code,
  state,
  setState,
  role,
  onSwitchRole,
}: {
  code: string;
  state: ClassicState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  role: ClassicRole;
  onSwitchRole: () => void;
}) {
  const { words, categories } = state;
  const revealed = useMemo(() => new Set(state.revealed), [state.revealed]);

  const blueStart = useMemo(() => categories.filter((cat) => cat === 'blue').length, [categories]);

  const redStart = useMemo(() => categories.filter((cat) => cat === 'red').length, [categories]);

  const blueScore = useMemo(
    () => blueStart - [...revealed].filter((card) => categories[card] === 'blue').length,
    [categories, revealed, blueStart],
  );

  const redScore = useMemo(
    () => redStart - [...revealed].filter((card) => categories[card] === 'red').length,
    [categories, revealed, redStart],
  );

  const isSpymaster = role === 'spymaster';

  function handleReveal(index: number) {
    if (revealed.has(index)) return;
    const deal = state.deal;
    // Optimistic reveal; the next SSE update reconciles if it didn't land.
    setState((prev) =>
      prev.mode === 'classic' && prev.deal === deal
        ? { ...prev, revealed: [...prev.revealed, index] }
        : prev,
    );
    revealCard({ data: { code, card: index, deal } }).catch(() => {});
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
    <div className="grow flex justify-center flex-col m-auto w-full px-6 max-w-4xl max-h-full">
      <div className="flex justify-between w-full mb-6 px-4">
        <div className="flex items-center space-x-4">
          {state.startingTeam === 'red' ? scoreBadges : scoreBadges.reverse()}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{isSpymaster ? 'Spymaster' : 'Operative'}</Badge>
          <Button variant="ghost" size="sm" onClick={onSwitchRole}>
            <ArrowLeftRight /> Switch role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 w-full px-4">
        {words.map((word, i) => (
          <GameCard
            onClick={() => handleReveal(i)}
            category={categories[i]!}
            key={`${state.deal}-${word}`}
            spymaster={isSpymaster}
            revealed={revealed.has(i)}
          >
            {word}
          </GameCard>
        ))}
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
  return (
    <FlipCard
      flipped={revealed}
      front={
        <Card
          onClick={onClick}
          className={cn(
            cardBaseStyle,
            'relative',
            cardCategoryVariants(),
            spymaster && cardSpymasterVariants({ variant: category }),
          )}
        >
          <CardContent className="text-center p-0">{children.toUpperCase()}</CardContent>
          {spymaster && category === 'death' && (
            <Skull className="absolute bottom-1.5 right-1.5 size-3.5 opacity-70" />
          )}
        </Card>
      }
      back={
        <Card
          onClick={onClick}
          className={cn(cardBaseStyle, cardCategoryVariants({ variant: category }))}
        >
          <CardContent className="text-center p-0">{children.toUpperCase()}</CardContent>
        </Card>
      }
    />
  );
}
