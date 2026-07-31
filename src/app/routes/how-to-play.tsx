import { Link, createFileRoute } from '@tanstack/react-router';
import { Skull } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { GridBG } from '~/components/background';
import { DemoTile, KeyDots, type TileVariant, TokenDots } from '~/components/demo-tile';
import { MotionProvider, m, riseItem, staggerParent, viewportOnce } from '~/components/motion';
import { SiteHeader } from '~/components/site-header';
import { Button } from '~/components/ui/button';
import { DUET_TOKENS, DUET_TOTAL_AGENTS } from '~/lib/modes';

export const Route = createFileRoute('/how-to-play')({
  head: () => ({ meta: [{ title: 'How to play — Codenames' }] }),
  component: RouteComponent,
});

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{
  id?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
}>) {
  return (
    <m.section
      id={id}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="scroll-mt-24 space-y-6"
    >
      <m.div variants={riseItem} className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 className="font-display text-3xl font-bold uppercase tracking-wide md:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="text-muted-foreground text-balance">{subtitle}</p>}
      </m.div>
      {children}
    </m.section>
  );
}

function Rule({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <m.div variants={riseItem} className="space-y-1">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </m.div>
  );
}

function ClueChip({ children }: React.PropsWithChildren) {
  return (
    <span className="inline-block rounded-md border bg-card/40 px-2 py-0.5 font-mono text-sm backdrop-blur-sm">
      {children}
    </span>
  );
}

/** Flips its tiles once when scrolled into view (immediately under reduced motion). */
function Exhibit({
  className,
  children,
}: {
  className?: string;
  children: (flipped: boolean) => React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  return (
    <m.div
      variants={riseItem}
      onViewportEnter={() => setFlipped(true)}
      viewport={viewportOnce}
      className={className}
    >
      {children(flipped || !!reduce)}
    </m.div>
  );
}

const CARD_COUNTS: { variant: TileVariant; word: string; caption: string; skull?: boolean }[] = [
  { variant: 'red', word: 'falcon', caption: '9 × starting team' },
  { variant: 'blue', word: 'harbor', caption: '8 × other team' },
  { variant: 'bystander', word: 'piano', caption: '7 × bystanders' },
  { variant: 'death', word: 'shadow', caption: '1 × assassin', skull: true },
];

// The homepage links here with #classic / #duet; keep these motifs in sync with the side picker.
const DUET_MOTIFS = [
  { label: 'Side A', pattern: 'g..k..gg....g.kg...ggk.gg' },
  { label: 'Side B', pattern: '.g..gk..g.g.k.g.g..gg.k.g' },
];

const TRY_TILES: { word: string; variant: TileVariant }[] = [
  { word: 'moon', variant: 'red' },
  { word: 'owl', variant: 'red' },
  { word: 'sun', variant: 'bystander' },
];

function TryItRow() {
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(new Set());
  return (
    <m.div
      variants={riseItem}
      className="space-y-3 rounded-lg border bg-card/25 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <ClueChip>NIGHT · 2</ClueChip>
        <span className="text-sm text-muted-foreground">Try it — tap a tile.</span>
      </div>
      <div className="grid max-w-xs grid-cols-3 gap-2">
        {TRY_TILES.map((tile, i) => (
          <DemoTile
            key={tile.word}
            word={tile.word}
            variant={tile.variant}
            flipped={flipped.has(i)}
            onClick={() =>
              setFlipped((prev) => {
                const next = new Set(prev);
                if (!next.delete(i)) next.add(i);
                return next;
              })
            }
            tileClassName="text-[10px]"
          />
        ))}
      </div>
    </m.div>
  );
}

function RouteComponent() {
  return (
    <MotionProvider>
      <div className="min-h-svh flex flex-col">
        <GridBG />
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl space-y-20 px-4 pb-24 pt-10">
          <Section
            eyebrow="// Field manual"
            title="How to play"
            subtitle="Every game starts the same: 25 codenames on the table. What they mean depends on the key."
          >
            <m.div variants={riseItem} className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="bg-card/25 backdrop-blur-sm">
                <Link to="/how-to-play" hash="classic">
                  Classic
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="bg-card/25 backdrop-blur-sm">
                <Link to="/how-to-play" hash="duet">
                  Duet
                </Link>
              </Button>
            </m.div>
            <m.div variants={riseItem} className="grid max-w-md grid-cols-5 gap-2">
              {['signal', 'raven', 'bridge', 'echo', 'vault'].map((word) => (
                <DemoTile
                  key={word}
                  word={word}
                  variant="bystander"
                  flipped={false}
                  tileClassName="text-[9px] sm:text-[10px]"
                />
              ))}
            </m.div>
            <m.p variants={riseItem} className="text-sm text-muted-foreground">
              Rooms deal 25 words from their word buckets. Only the key says which cards are agents,
              which are bystanders — and which one is the assassin.
            </m.p>
          </Section>

          <Section
            id="classic"
            eyebrow="// Operation: Classic"
            title="Classic"
            subtitle="Two teams. One key. First to contact every agent wins."
          >
            <Exhibit className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(flipped) =>
                CARD_COUNTS.map((card) => (
                  <div key={card.variant} className="space-y-2">
                    <DemoTile
                      word={card.word}
                      variant={card.variant}
                      flipped={flipped}
                      tileClassName="text-[10px]"
                    >
                      {card.skull ? <Skull className="size-5" /> : undefined}
                    </DemoTile>
                    <p className="text-center font-mono text-xs text-muted-foreground">
                      {card.caption}
                    </p>
                  </div>
                ))
              }
            </Exhibit>
            <m.p variants={riseItem} className="text-sm text-muted-foreground">
              The starting team has one extra agent to find, because it goes first.
            </m.p>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Rule title="Teams and roles">
                Split into red and blue. Each team picks a spymaster; everyone else is an operative.
                Only spymasters see the key.
              </Rule>
              <Rule title="Give a clue">
                One word and one number, like <ClueChip>OCEAN · 3</ClueChip> — the word connects
                your agents' codenames, the number says how many.
              </Rule>
              <Rule title="Guess">
                Tap a tile to contact it. Your agent: keep guessing, up to the number plus one.
                Anyone else's card ends your turn. The assassin ends the game — you lose on the
                spot.
              </Rule>
              <Rule title="Win">
                Contact all of your team's agents before the other team finds theirs.
              </Rule>
            </div>
            <TryItRow />
          </Section>

          <Section
            id="duet"
            eyebrow="// Operation: Duet"
            title="Duet"
            subtitle="Co-op for two sides. Same words, different keys."
          >
            <m.div variants={riseItem} className="flex flex-wrap items-center gap-8">
              {DUET_MOTIFS.map((side) => (
                <div key={side.label} className="space-y-2">
                  <KeyDots pattern={side.pattern} className="gap-1.5" />
                  <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {side.label}
                  </p>
                </div>
              ))}
              <p className="max-w-[16rem] text-sm text-muted-foreground">
                Each side's key shows 9 agents, 3 assassins, and 13 bystanders. The keys overlap —{' '}
                {DUET_TOTAL_AGENTS} unique agents in total.
              </p>
            </m.div>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Rule title="Your guesses run on their key">
                When you guess, the tile resolves against your partner's key. They clue what they
                can see; you trust it.
              </Rule>
              <Rule title="The clock">
                You share {DUET_TOKENS} timer tokens. Hitting a bystander — or choosing to end your
                turn — spends one.
              </Rule>
              <Rule title="Sudden death">
                At zero tokens there are no more clues. You can only keep guessing, and any wrong
                tile loses the game.
              </Rule>
              <Rule title="Win or lose together">
                Find all {DUET_TOTAL_AGENTS} agents to win. Reveal any assassin — on either key —
                and it's over.
              </Rule>
            </div>
            <Exhibit className="flex items-center gap-3 rounded-lg border bg-card/25 p-4 backdrop-blur-sm">
              {(flipped) => (
                <>
                  <TokenDots total={DUET_TOKENS} spent={flipped ? 2 : 0} />
                  <span className="text-sm text-muted-foreground">
                    Two tokens down, seven turns of clues left.
                  </span>
                </>
              )}
            </Exhibit>
          </Section>

          <m.div
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="space-y-4"
          >
            <m.p
              variants={riseItem}
              className="font-mono text-xs uppercase tracking-widest text-primary"
            >
              {'// Ready for the field?'}
            </m.p>
            <m.div variants={riseItem} className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard">Create a game</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-card/25 backdrop-blur-sm">
                <Link to="/">Back to home</Link>
              </Button>
            </m.div>
          </m.div>
        </main>
      </div>
    </MotionProvider>
  );
}
