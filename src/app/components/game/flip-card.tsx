import { cn } from '~/lib/utils';

export const cardBaseStyle =
  'aspect-[4/3] flex items-center justify-center cursor-pointer hover:bg-accent transition-all';

/** 3D flip shell shared by the game boards; `flipped` rotates to the back face. */
export function FlipCard({
  flipped,
  front,
  back,
  className,
}: {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('perspective-[1000px] cursor-pointer', className)}>
      <div
        data-revealed={flipped}
        className="relative transform-3d transition-transform duration-700 text-white data-[revealed=true]:rotate-y-180"
      >
        <div className="backface-hidden w-full h-full inset-0 rotate-y-0">{front}</div>
        <div className="backface-hidden absolute w-full h-full inset-0 rotate-y-180">{back}</div>
      </div>
    </div>
  );
}
