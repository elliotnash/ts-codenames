import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import type { Variants } from 'motion/react';

/* Never import this module from entry-bundled files (router.tsx → not-found.tsx →
   error-card.tsx / demo-tile.tsx / site-header.tsx) — those stay CSS-animated.
   Route files are code-split, so importing motion from them is fine. */

export function MotionProvider({ children }: React.PropsWithChildren) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export { m, AnimatePresence };

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const viewportOnce = { once: true, amount: 0.3 } as const;

/* Deal-cascade helpers for the game boards: a per-card mount entrance keyed by
   `${deal}-${word}`, so every new deal replays the cascade. Animates only the
   wrapper (opacity/y) — never the FlipCard itself, whose CSS flip must stay
   independent. */
export const dealHidden = { opacity: 0, y: 10 };
export const dealShown = { opacity: 1, y: 0 };
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export function dealTransition(index = 0) {
  return { duration: 0.35, ease: EASE_OUT, delay: index * 0.02 };
}
