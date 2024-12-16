import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/start';
import { cva } from 'class-variance-authority';
import { Card, CardContent } from '~/components/ui/card';
import * as fs from 'node:fs/promises';
import { useEffect, useMemo, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { ServerEventSchema, type RevealCardEventSchema } from '~/socket-events';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { GradientBG } from '~/components/background';
import { UserMenu } from '~/components/user-menu';
import { useAuth } from '~/hooks/use-auth';

export const Route = createFileRoute('/game/$id')({
  loader: async () => {
    const words = await getGameWords();
    const categories = await getGameCategories();
    return { words, categories };
  },
  component: Index,
});

let words: string[] | undefined;

const getGameWords = createServerFn().handler(async () => {
  if (!words) {
    const wordString = await fs.readFile('words.txt', 'utf-8');
    const wordsArr = wordString
      .replaceAll('\n', ',')
      .split(',')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    const shuffled = wordsArr.sort(() => 0.5 - Math.random());

    words = shuffled.slice(0, 25);
  }
  return words;
});

type Category = 'blue' | 'red' | 'bystander' | 'death';

let categories: Category[] | undefined;

const getGameCategories = createServerFn().handler(async () => {
  if (!categories) {
    const gameWords = await getGameWords();
    const shuffled = gameWords.slice().sort(() => 0.5 - Math.random());

    const death = shuffled[0]!;
    const teamA = shuffled.slice(1, 9);
    const teamB = shuffled.slice(9, 18);

    const newCategories: Category[] = Array(25).fill('bystander');

    const deathIndex = gameWords.indexOf(death);
    newCategories[deathIndex] = 'death';

    for (const word of teamA) {
      const index = gameWords.indexOf(word);
      newCategories[index] = 'blue';
    }

    for (const word of teamB) {
      const index = gameWords.indexOf(word);
      newCategories[index] = 'red';
    }

    categories = newCategories;
  }
  return categories;
});

function Index() {
  const auth = useAuth();

  const { words, categories } = Route.useLoaderData();

  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());

  // Websocket connection for receiving card reveal updates and sending card reveals.
  const connection = useRef<WebSocket | null>(null);
  useEffect(() => {
    const ssl = window.location.protocol === 'https:';
    const socket = new WebSocket(`${ssl ? 'wss' : 'ws'}://${window.location.host}/_ws`);

    // Connection opened
    socket.addEventListener('open', (event) => {
      socket.send('ping');
    });

    // Listen for messages and handle
    socket.addEventListener('message', (event) => {
      try {
        const jsonMessage = JSON.parse(event.data);
        const { data } = ServerEventSchema.safeParse(jsonMessage);
        if (data) {
          match(data).with({ type: 'revealedCardsUpdate' }, (update) => {
            console.log('Setting revealed cards');
            setRevealedCards(update.revealedCards);
          });
        }
      } catch (e) {
        console.log("Couldn't parse websocket message:", event.data);
      }
    });

    connection.current = socket;
    return () => socket.close();
  }, []);

  function revealCard(index: number) {
    setRevealedCards((cards) => new Set([...cards, index]));
    connection.current?.send(
      JSON.stringify({ type: 'revealCard', card: index } satisfies Zod.infer<
        typeof RevealCardEventSchema
      >),
    );
  }

  const blueStart = useMemo(() => categories.filter((cat) => cat === 'blue').length, [categories]);

  const redStart = useMemo(() => categories.filter((cat) => cat === 'red').length, [categories]);

  const blueScore = useMemo(
    () => blueStart - [...revealedCards].filter((card) => categories[card] === 'blue').length,
    [categories, revealedCards, blueStart],
  );

  const redScore = useMemo(
    () => redStart - [...revealedCards].filter((card) => categories[card] === 'red').length,
    [categories, revealedCards, redStart],
  );

  // Spymaster toggle
  const [isSpymaster, setIsSpymaster] = useState(false);

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
        <h1 className="text-4xl font-bold">Codenames</h1>
        <div className="flex gap-2">
          {auth.isAuthenticated && <Button variant="ghost">New Game</Button>}
          <UserMenu />
        </div>
      </div>
      <div className="grow flex justify-center flex-col m-auto w-full px-6 max-w-4xl max-h-full">
        <div className="flex justify-between w-full mb-6 px-4">
          <div className="flex space-x-4">
            {redStart > blueStart ? scoreBadges : scoreBadges.reverse()}
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="spymaster-mode" checked={isSpymaster} onCheckedChange={setIsSpymaster} />
            <Label htmlFor="spymaster-mode">Spymaster Mode</Label>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 w-full px-4">
          {words.map((word, i) => (
            <GameCard
              onClick={() => revealCard(i)}
              category={categories[i]!}
              key={word}
              spymaster={isSpymaster}
              revealed={revealedCards.has(i)}
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
    <div className="perspective-1000 cursor-pointer">
      <div
        data-revealed={revealed}
        className="relative transform-style-3d transition-transform duration-700 transform text-white data-[revealed=true]:rotate-y-180"
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
