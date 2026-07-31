import { m, riseItem, staggerParent } from '~/components/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import type { ClassicRole } from '~/lib/room-view-cookies';
import { cn } from '~/lib/utils';

// Decorative boards: operatives see mostly unrevealed cards, spymasters see the
// full key (9 red, 8 blue, 7 bystanders, 1 death) — NOT the real board.
const ROLE_MOTIFS: Record<ClassicRole, string> = {
  operative: '.r......b.......b......r.',
  spymaster: 'rbtrbbrrtbtrbkrbtrbtrtbrt',
};

const ROLE_INFO: Record<ClassicRole, { label: string; caption: string }> = {
  operative: { label: 'Operative', caption: 'Sees only revealed cards' },
  spymaster: { label: 'Spymaster', caption: 'Sees the full key card' },
};

function RoleMotif({ role }: { role: ClassicRole }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {ROLE_MOTIFS[role].split('').map((cell, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative pattern
          key={`${role}-${i}`}
          className={cn(
            'size-2 rounded-[3px]',
            cell === 'r' && 'bg-card-red',
            cell === 'b' && 'bg-card-blue',
            cell === 't' && 'bg-card-bystander',
            cell === 'k' && 'bg-card-death',
            cell === '.' && 'bg-muted-foreground/25',
          )}
        />
      ))}
    </div>
  );
}

export function ClassicRolePicker({ onPick }: { onPick: (role: ClassicRole) => void }) {
  return (
    <div className="grow flex items-center justify-center p-6">
      <m.div variants={staggerParent} initial="hidden" animate="show" className="w-full max-w-lg">
        <Card className="backdrop-blur-sm bg-card/25">
          <CardHeader className="text-center">
            <m.p
              variants={riseItem}
              className="font-mono text-xs uppercase tracking-widest text-primary"
            >
              {'// Field assignment'}
            </m.p>
            <m.div variants={riseItem}>
              <CardTitle className="font-display text-3xl font-bold uppercase tracking-wide">
                Choose your role
              </CardTitle>
            </m.div>
            <m.div variants={riseItem}>
              <CardDescription className="text-balance">
                Spymasters see which team every card belongs to and give the clues. Operatives only
                see what's been revealed — no peeking!
              </CardDescription>
            </m.div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {(['operative', 'spymaster'] as const).map((role) => (
              <m.button
                variants={riseItem}
                key={role}
                type="button"
                onClick={() => onPick(role)}
                className="group flex flex-col items-center gap-3 rounded-lg border bg-card/40 p-6 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:scale-[1.03] active:scale-[0.99]"
              >
                <RoleMotif role={role} />
                <span className="font-semibold">{ROLE_INFO[role].label}</span>
                <span className="text-xs text-muted-foreground">{ROLE_INFO[role].caption}</span>
              </m.button>
            ))}
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
}
