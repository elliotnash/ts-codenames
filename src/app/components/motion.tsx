import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import type { Variants } from 'motion/react';

/* Motion is only loaded on the marketing pages (/, /how-to-play) — never import
   this module from entry-bundled files (router.tsx and anything it reaches). */

export function MotionProvider({ children }: React.PropsWithChildren) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export { m };

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const viewportOnce = { once: true, amount: 0.3 } as const;
