import { Badge, type BadgeTone } from "@/components/ui";
import { SEMINAR_TYPE_LABELS, type SeminarType } from "@/db/schema";

const TYPE_TONE: Record<SeminarType, BadgeTone> = {
  proposal: "blue",
  result: "violet",
  final: "green",
};

export function SeminarTypeBadge({ type }: { type: SeminarType }) {
  return <Badge tone={TYPE_TONE[type]}>{SEMINAR_TYPE_LABELS[type]}</Badge>;
}

/** Badge status waktu: Mendatang vs Selesai (nilai dihitung di lapisan query). */
export function SeminarWhenBadge({ upcoming }: { upcoming: boolean }) {
  return (
    <Badge tone={upcoming ? "amber" : "neutral"}>
      {upcoming ? "Mendatang" : "Selesai"}
    </Badge>
  );
}
