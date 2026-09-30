import { Badge, type BadgeTone } from "@/components/ui";
import {
  THESIS_STATUS_LABELS,
  type ThesisStatus,
} from "@/db/schema";

const STATUS_TONE: Record<ThesisStatus, BadgeTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export function ThesisStatusBadge({ status }: { status: ThesisStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>{THESIS_STATUS_LABELS[status]}</Badge>
  );
}
