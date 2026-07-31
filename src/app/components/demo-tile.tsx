import { type VariantProps, cva } from 'class-variance-authority';
import { FlipCard } from '~/components/game/flip-card';
import { Card } from '~/components/ui/card';
import { cn } from '~/lib/utils';

/* Decorative Codenames tiles for marketing/error pages. Kept motion-free so
   entry-bundled pages (404, error cards) can import them. */

export const tileVariants = cva('', {
  variants: {
    variant: {
      red: 'bg-card-red text-card-red-foreground',
      blue: 'bg-card-blue text-card-blue-foreground',
      bystander: 'bg-card-bystander text-card-bystander-foreground',
      death: 'bg-card-death text-card-death-foreground',
      agent: 'bg-card-agent text-card-agent-foreground',
    },
  },
});

export type TileVariant = NonNullable<VariantProps<typeof tileVariants>['variant']>;

const tileBaseStyle = 'aspect-[4/3] flex items-center justify-center select-none transition-all';

export function DemoTile({
  word,
  children,
  variant,
  flipped,
  onClick,
  className,
  tileClassName,
}: {
  word?: string;
  children?: React.ReactNode;
  variant: TileVariant;
  flipped: boolean;
  onClick?: () => void;
  className?: string;
  tileClassName?: string;
}) {
  const interactive = onClick ? 'cursor-pointer' : 'cursor-default';
  const card = (
    <FlipCard
      flipped={flipped}
      className={cn(interactive, className)}
      front={
        <Card
          className={cn(
            tileBaseStyle,
            interactive,
            'text-card-foreground text-xs font-medium uppercase',
            tileClassName,
          )}
        >
          {word?.toUpperCase()}
        </Card>
      }
      back={
        <Card
          className={cn(
            tileBaseStyle,
            interactive,
            'text-xs font-medium uppercase',
            tileVariants({ variant }),
            tileClassName,
          )}
        >
          {children ?? word?.toUpperCase()}
        </Card>
      }
    />
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Reveal ${word ?? 'card'}`}
      className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card}
    </button>
  ) : (
    <div aria-hidden>{card}</div>
  );
}

/** 5×5 mini key-card grid; `pattern` is 25 chars of r/b/g/k/. (red/blue/agent/assassin/none). */
export function KeyDots({ pattern, className }: { pattern: string; className?: string }) {
  return (
    <div aria-hidden className={cn('grid grid-cols-5 gap-1', className)}>
      {pattern.split('').map((cell, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative pattern
          key={i}
          className={cn(
            'size-2 rounded-[3px]',
            cell === 'r' && 'bg-card-red',
            cell === 'b' && 'bg-card-blue',
            cell === 'g' && 'bg-card-agent',
            cell === 'k' && 'bg-card-death',
            cell === '.' && 'bg-muted-foreground/25',
          )}
        />
      ))}
    </div>
  );
}

/** Duet timer-token row; spent tokens stay visible but faded. */
export function TokenDots({ total, spent }: { total: number; spent: number }) {
  return (
    <div aria-hidden className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size static list
          key={i}
          className={cn(
            'size-2.5 rounded-full',
            i < total - spent ? 'bg-primary' : 'bg-primary/20',
          )}
        />
      ))}
    </div>
  );
}
