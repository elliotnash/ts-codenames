import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Check, HeartHandshake, Swords } from 'lucide-react';
import { MODE_INFO } from '~/lib/modes';
import { type GameMode, GameModeSchema } from '~/lib/room-events';
import { cn } from '~/lib/utils';

const MODE_ICONS: Record<GameMode, React.ComponentType<{ className?: string }>> = {
  classic: Swords,
  duet: HeartHandshake,
};

/** Side-by-side game-mode cards with radio semantics (arrow-key navigable). */
export function GameModeSelector({
  value,
  onChange,
  className,
}: {
  value: GameMode;
  onChange: (mode: GameMode) => void;
  className?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(next) => onChange(GameModeSchema.parse(next))}
      className={cn('grid grid-cols-2 gap-3', className)}
    >
      {GameModeSchema.options.map((mode) => {
        const Icon = MODE_ICONS[mode];
        return (
          <RadioGroupPrimitive.Item
            key={mode}
            value={mode}
            className="group relative flex flex-col items-start gap-1.5 rounded-lg border bg-card/25 backdrop-blur-sm p-4 text-left cursor-pointer transition-all duration-200 hover:border-primary/50 data-[state=checked]:border-primary data-[state=checked]:ring-2 data-[state=checked]:ring-primary/40 data-[state=checked]:bg-primary/5 data-[state=checked]:scale-[1.02]"
          >
            <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground scale-0 transition-transform duration-200 group-data-[state=checked]:scale-100">
              <Check className="size-3.5" />
            </span>
            <Icon className="size-5 text-primary" />
            <span className="font-semibold text-sm">{MODE_INFO[mode].label}</span>
            <span className="text-xs text-muted-foreground text-balance">
              {MODE_INFO[mode].description}
            </span>
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
