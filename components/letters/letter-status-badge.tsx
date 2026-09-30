import { Badge, type BadgeTone } from "@/components/ui";
import {
  LETTER_STATUS_LABELS,
  type LetterStatus,
} from "@/db/schema";

const STATUS_TONE: Record<LetterStatus, BadgeTone> = {
  pending_staff: "amber",
  pending_kaprodi: "blue",
  approved: "green",
  rejected: "red",
};

export function LetterStatusBadge({ status }: { status: LetterStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>{LETTER_STATUS_LABELS[status]}</Badge>
  );
}
