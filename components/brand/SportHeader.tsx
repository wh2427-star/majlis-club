import { useTranslations } from "next-intl";
import { DotsDivide } from "./DotsDivide";
import { hasMotionShape } from "./sportShapes";
import { LogoMark } from "./Logo";
import { Illustration } from "./Illustration";
import { isIllustrationSport } from "@/lib/illustrations";

/** Sport category header: the dots form the sport once; plain doorway for sports without a drawn shape. */
export function SportHeader({ sport, seed }: { sport: string; seed: string }) {
  const t = useTranslations();
  const name = t(`sports.${sport}`);
  return (
    <div className="mb-3 flex flex-col gap-2" data-testid="sport-header">
      <div className="flex items-center gap-3">
        {hasMotionShape(sport) ? <DotsDivide sport={sport} size={56} label={name} /> : <LogoMark size={56} title={name} />}
        <span className="text-lg font-semibold">{name}</span>
      </div>
      {isIllustrationSport(sport) ? <Illustration sport={sport} seed={`header:${seed}`} size="md" priority /> : null}
    </div>
  );
}
