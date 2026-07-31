import { GridBG } from '~/components/background';
import { MotionProvider, m, staggerParent } from '~/components/motion';

/** Shared centered shell for the auth pages: GridBG + a staggered max-w-sm column. */
export function AuthShell({ children }: React.PropsWithChildren) {
  return (
    <MotionProvider>
      <GridBG />
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <m.div
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm"
        >
          {children}
        </m.div>
      </div>
    </MotionProvider>
  );
}
