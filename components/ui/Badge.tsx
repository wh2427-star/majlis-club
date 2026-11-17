import { Icon, type IconName } from "./Icon";

export type BadgeKind = "licence" | "trial" | "featured" | "status" | "warning";

// Every badge carries words and an icon, never colour alone. Ink text on light grounds only.
const styles: Record<BadgeKind, { cls: string; icon: IconName }> = {
  licence: { cls: "bg-sunshine text-ink", icon: "check" },
  trial: { cls: "bg-sunshine text-ink", icon: "tag" },
  featured: { cls: "bg-sky text-ink", icon: "star" },
  status: { cls: "bg-white text-ink border border-ink", icon: "info" },
  warning: { cls: "bg-pink text-ink", icon: "alert" },
};

export function Badge({ kind, children, icon }: { kind: BadgeKind; children: React.ReactNode; icon?: IconName }) {
  const s = styles[kind];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${s.cls}`}>
      <Icon name={icon ?? s.icon} size={16} />
      {children}
    </span>
  );
}
