import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { DUET_TOKENS, DUET_TOTAL_AGENTS } from '~/lib/modes';
import type { DuetPublicState, DuetSide } from '~/lib/room-events';
import { cn } from '~/lib/utils';

// Decorative key-card patterns (9 agents, 3 assassins each) — NOT the real keys.
const SIDE_MOTIFS: Record<DuetSide, string> = {
  a: 'g..k..gg....g.kg...ggk.gg',
  b: '.g..gk..g.g.k.g.g..gg.k.g',
};

function KeyMotif({ side }: { side: DuetSide }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {SIDE_MOTIFS[side].split('').map((cell, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative pattern
          key={`${side}-${i}`}
          className={cn(
            'size-2 rounded-[3px] transition-colors',
            cell === 'g' && 'bg-card-agent',
            cell === 'k' && 'bg-card-death',
            cell === '.' && 'bg-muted-foreground/25',
          )}
        />
      ))}
    </div>
  );
}

export function DuetSidePicker({
  duet,
  onPick,
}: {
  duet: DuetPublicState;
  onPick: (side: DuetSide) => void;
}) {
  const fresh =
    duet.tokens === DUET_TOKENS &&
    duet.agents.length === 0 &&
    duet.bystandersA.length === 0 &&
    duet.bystandersB.length === 0;

  return (
    <div className="grow flex items-center justify-center p-6">
      <Card className="w-full max-w-lg backdrop-blur-sm bg-card/25">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Choose your side</CardTitle>
          <CardDescription className="text-balance">
            Both players see the same words but different halves of the key card. Several people can
            share a side — everyone on it sees the same key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {(['a', 'b'] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => onPick(side)}
                className="group flex flex-col items-center gap-3 rounded-lg border bg-card/40 p-6 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:scale-[1.03] active:scale-[0.99]"
              >
                <KeyMotif side={side} />
                <span className="font-semibold">Player {side.toUpperCase()}</span>
                <span className="text-xs text-muted-foreground">9 agents · 3 assassins</span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {duet.status !== 'playing'
              ? 'The last mission is over — pick a side to see how it ended.'
              : fresh
                ? `A fresh mission: find all ${DUET_TOTAL_AGENTS} agents within ${DUET_TOKENS} turns.`
                : `Mission in progress — ${duet.agents.length}/${DUET_TOTAL_AGENTS} agents found, ${duet.tokens} ${duet.tokens === 1 ? 'turn' : 'turns'} left.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
