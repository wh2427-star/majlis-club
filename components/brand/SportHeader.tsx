import { useTranslations } from "next-intl";
import { DotsDivide } from "./DotsDivide";
import { hasMotionShape } from "./sportShapes";
import { LogoMark } from "./Logo";

/** Sport category header: the dots form the sport once; plain doorway for sports without a drawn shape. */
export function SportHeader({ sport }: { sport: string }) {
  const t = useTranslations();
  const name = t(`sports.${sport}`);
  return (
    <div className="mb-2 flex items-center gap-3" data-testid="sport-header">
      {hasMotionShape(sport) ? <DotsDivide sport={sport} size={56} label={name} /> : <LogoMark size={56} title={name} />}
      <span className="text-lg font-semibold">{name}</span>
    </div>
  );
}
