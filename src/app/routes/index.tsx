import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { GridBG } from '~/components/background';
import { DemoTile, KeyDots, type TileVariant } from '~/components/demo-tile';
import { MotionProvider, m, riseItem, staggerParent } from '~/components/motion';
import { SiteHeader } from '~/components/site-header';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useAuth } from '~/hooks/use-auth';
import { MODE_INFO } from '~/lib/modes';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Codenames' }] }),
  component: RouteComponent,
});

// Fixed demo board: spy-flavored words over a plausible classic key (9r/8b/7 bystanders/1 death).
const HERO_WORDS = `berlin shadow cipher night angel crown satellite piano ghost opera needle paris whale
   contact mole ice theater falcon train mirror vault storm dragon key agent`.split(/\s+/);
const HERO_KEY = 'r b y r b y r r b y b r k b y r b r y b r y b r y'
  .split(' ')
  .map((c) => (({ r: 'red', b: 'blue', y: 'bystander', k: 'death' }) as const)[c] as TileVariant);
// Mid-game reveals, flipped one-by-one on mount; the death card (index 12) stays face-down.
const REVEAL_ORDER = [0, 6, 18, 2, 21, 9, 16, 4];
// Ambient "consider a card" teases cycle through these after the intro.
const TEASE_ORDER = [7, 24, 11, 3, 19, 14];

function HeroBoard() {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(new Set());
  const [tease, setTease] = useState<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setFlipped(new Set(REVEAL_ORDER));
      return;
    }
    const flips = REVEAL_ORDER.map((tile, i) =>
      setTimeout(() => setFlipped((prev) => new Set(prev).add(tile)), 500 + i * 130),
    );
    let teaseBack: ReturnType<typeof setTimeout> | undefined;
    let cycle = 0;
    const ambient = setInterval(() => {
      setTease(TEASE_ORDER[cycle++ % TEASE_ORDER.length] ?? null);
      teaseBack = setTimeout(() => setTease(null), 1800);
    }, 4200);
    return () => {
      for (const timer of flips) clearTimeout(timer);
      clearInterval(ambient);
      clearTimeout(teaseBack);
    };
  }, [reduce]);

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 lg:[transform:perspective(1200px)_rotateY(-6deg)_rotateX(2deg)]">
      {HERO_WORDS.map((word, i) => (
        <DemoTile
          key={word}
          word={word}
          variant={HERO_KEY[i] ?? 'bystander'}
          flipped={flipped.has(i) || tease === i}
          tileClassName="text-[9px] sm:text-[10px] leading-none px-1 text-center"
        />
      ))}
    </div>
  );
}

function JoinForm() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const raw = joinCode.trim().toLowerCase();
    // Accept a pasted room link by taking its last path segment.
    const code = (raw.includes('/') ? raw.split('/').filter(Boolean).pop() : raw) ?? '';
    if (code) navigate({ to: '/game/$code', params: { code } });
  }

  return (
    <form onSubmit={handleJoin} className="flex items-center gap-2">
      <Label htmlFor="join-code" className="sr-only">
        Room code
      </Label>
      <Input
        id="join-code"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
        placeholder="brave-tiger"
        className="w-44 font-mono bg-card/25 backdrop-blur-sm"
        required
      />
      <Button type="submit" variant="secondary">
        Join room
      </Button>
    </form>
  );
}

function RouteComponent() {
  const auth = useAuth();

  return (
    <MotionProvider>
      <div className="min-h-svh flex flex-col">
        <GridBG />
        <SiteHeader />
        <main className="container mx-auto flex grow flex-col justify-center gap-16 px-4 py-12">
          <m.div
            variants={staggerParent}
            initial="hidden"
            animate="show"
            className="grid items-center gap-12 lg:grid-cols-2"
          >
            <m.div variants={staggerParent} className="flex flex-col items-start gap-5">
              <m.p
                variants={riseItem}
                className="font-mono text-xs uppercase tracking-widest text-primary"
              >
                {'// Mission briefing'}
              </m.p>
              <m.h1
                variants={riseItem}
                className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-wide md:text-7xl"
              >
                Contact your <span className="text-primary">agents</span>.
                <br />
                Dodge the assassin.
              </m.h1>
              <m.p variants={riseItem} className="max-w-md text-muted-foreground text-balance">
                One-word clues, twenty-five codenames, and one card that ends everything. Play
                Classic head-to-head or Duet together.
              </m.p>
              <m.div variants={riseItem} className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/dashboard">Create a game</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-card/25 backdrop-blur-sm">
                  <Link to="/how-to-play">How to play</Link>
                </Button>
              </m.div>
              <m.div variants={riseItem}>
                <JoinForm />
              </m.div>
              {!auth.isAuthenticated && (
                <m.p variants={riseItem} className="text-sm text-muted-foreground">
                  <Link to="/login" className="underline transition-colors hover:text-foreground">
                    Log in
                  </Link>{' '}
                  or{' '}
                  <Link
                    to="/register"
                    className="underline transition-colors hover:text-foreground"
                  >
                    register
                  </Link>{' '}
                  to create a game
                </m.p>
              )}
            </m.div>
            <m.div variants={riseItem}>
              <HeroBoard />
            </m.div>
          </m.div>

          <m.div
            variants={riseItem}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl"
          >
            {(
              [
                { mode: 'classic', hash: 'classic', dots: 'r.b.rb.r..rrb.b.br.b.r.bb' },
                { mode: 'duet', hash: 'duet', dots: 'g..k..gg....g.kg...ggk.gg' },
              ] as const
            ).map(({ mode, hash, dots }) => (
              <Link
                key={mode}
                to="/how-to-play"
                hash={hash}
                className="group flex items-center gap-4 rounded-lg border bg-card/25 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/50"
              >
                <KeyDots pattern={dots} className="shrink-0" />
                <div>
                  <div className="font-display text-lg font-bold uppercase tracking-wide group-hover:text-primary transition-colors">
                    {MODE_INFO[mode].label}
                  </div>
                  <p className="text-sm text-muted-foreground">{MODE_INFO[mode].description}</p>
                </div>
              </Link>
            ))}
          </m.div>
        </main>
      </div>
    </MotionProvider>
  );
}
