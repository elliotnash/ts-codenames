import { m, riseItem } from '~/components/motion';
import { cn } from '~/lib/utils';

/* Relies on an ancestor `staggerParent` m element for its entrance — variants
   propagate through plain wrapper elements. */
export function PageHeading({
  eyebrow,
  title,
  description,
  center = false,
  size = 'lg',
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', center && 'text-center', className)}>
      <m.p
        variants={riseItem}
        className="font-mono text-xs uppercase tracking-widest text-primary"
      >
        {eyebrow}
      </m.p>
      <m.h1
        variants={riseItem}
        className={cn(
          'font-display font-bold uppercase tracking-wide',
          size === 'lg' ? 'text-3xl md:text-4xl' : 'text-2xl',
        )}
      >
        {title}
      </m.h1>
      {description && (
        <m.p variants={riseItem} className="text-sm text-muted-foreground text-balance">
          {description}
        </m.p>
      )}
    </div>
  );
}
