import { useReducedMotion } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { GridBG } from '~/components/background';
import { DemoTile } from '~/components/demo-tile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

/* Error screens render from entry-bundled code paths (global 404) — CSS animations
   only, no motion import. */

const rise = 'animate-rise-in motion-reduce:animate-none';

/** A DemoTile that flips itself shortly after mount (instantly under reduced motion). */
export function AutoFlipTile({
  delay = 350,
  ...tile
}: Omit<React.ComponentProps<typeof DemoTile>, 'flipped' | 'onClick'> & { delay?: number }) {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return <DemoTile {...tile} flipped={flipped || !!reduce} />;
}

export function ErrorScreen({
  eyebrow,
  title,
  description,
  tile,
  code,
  children,
}: React.PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  tile?: React.ReactNode;
  code?: string;
}>) {
  return (
    <div>
      <GridBG />
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <Card className={`w-full max-w-md backdrop-blur-sm bg-card/25 ${rise}`}>
          <CardHeader>
            {tile && (
              <div className={`w-24 pb-3 ${rise}`} style={{ animationDelay: '0.05s' }}>
                {tile}
              </div>
            )}
            <p
              className={`font-mono text-xs uppercase tracking-widest text-primary ${rise}`}
              style={{ animationDelay: '0.1s' }}
            >
              {eyebrow}
            </p>
            <CardTitle
              className={`font-display text-3xl uppercase tracking-wide ${rise}`}
              style={{ animationDelay: '0.15s' }}
            >
              {title}
            </CardTitle>
            {code && (
              <p className={rise} style={{ animationDelay: '0.2s' }}>
                <span className="inline-block rounded-md border bg-card/40 px-2 py-0.5 font-mono text-sm">
                  {code}
                </span>
              </p>
            )}
            <CardDescription className={rise} style={{ animationDelay: '0.25s' }}>
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className={`grid gap-2 ${rise}`} style={{ animationDelay: '0.3s' }}>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
