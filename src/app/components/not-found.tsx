import { useDocumentTitle } from '@mantine/hooks';
import { Link, useLocation } from '@tanstack/react-router';
import { GridBG } from '~/components/background';
import { AutoFlipTile } from '~/components/error-card';
import { Button } from '~/components/ui/button';

/* Entry-bundled via router.tsx's defaultNotFoundComponent — CSS animations only,
   no motion import. */

const rise = 'animate-rise-in motion-reduce:animate-none';

const DIGITS = [
  { word: 'page', digit: '4', variant: 'red', delay: 350 },
  { word: 'not', digit: '0', variant: 'death', delay: 500 },
  { word: 'found', digit: '4', variant: 'blue', delay: 650 },
] as const;

export function NotFoundPage() {
  const pathname = useLocation({ select: (location) => location.pathname });
  useDocumentTitle('Page not found — Codenames');

  return (
    <div>
      <GridBG />
      <main className="flex min-h-svh w-full flex-col items-center justify-center gap-8 p-6 text-center">
        <div className={`grid w-full max-w-xs grid-cols-3 gap-2 sm:gap-3 ${rise}`}>
          {DIGITS.map((tile) => (
            <AutoFlipTile
              key={tile.word}
              word={tile.word}
              variant={tile.variant}
              delay={tile.delay}
              tileClassName="text-[10px]"
            >
              <span className="font-display text-4xl font-bold">{tile.digit}</span>
            </AutoFlipTile>
          ))}
        </div>
        <div className="space-y-3">
          <p
            className={`font-mono text-xs uppercase tracking-widest text-primary ${rise}`}
            style={{ animationDelay: '0.1s' }}
          >
            {'// Signal lost'}
          </p>
          <h1
            className={`font-display text-4xl font-bold uppercase tracking-wide md:text-5xl ${rise}`}
            style={{ animationDelay: '0.15s' }}
          >
            Page not found
          </h1>
          <p
            className={`font-mono text-sm text-muted-foreground ${rise}`}
            style={{ animationDelay: '0.2s' }}
          >
            &gt; {pathname}
          </p>
          <p className={`text-muted-foreground ${rise}`} style={{ animationDelay: '0.25s' }}>
            This page isn't on the board.
          </p>
        </div>
        <div className={`flex flex-wrap justify-center gap-3 ${rise}`} style={{ animationDelay: '0.3s' }}>
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline" className="bg-card/25 backdrop-blur-sm">
            <Link to="/how-to-play">How to play</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
