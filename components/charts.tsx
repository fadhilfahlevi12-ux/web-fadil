import { EmptyState } from "@/components/ui";

/**
 * Komponen grafik ringan berbasis Tailwind (tanpa library chart tambahan,
 * sesuai stack PRD). Semuanya Server Component — data dikirim sudah jadi
 * dari `lib/queries/stats.ts`.
 */

type Tone = "blue" | "violet" | "green" | "amber" | "red";

const BAR_TONES: Record<Tone, string> = {
  blue: "bg-gradient-to-t from-blue-600 to-blue-400",
  violet: "bg-gradient-to-t from-violet-600 to-violet-400",
  green: "bg-gradient-to-t from-emerald-600 to-emerald-400",
  amber: "bg-gradient-to-t from-amber-500 to-amber-300",
  red: "bg-gradient-to-t from-red-500 to-red-300",
};

const SOLID_TONES: Record<Tone, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export type ChartSeries = { label: string; value: number };

function totalOf(data: ChartSeries[]) {
  return data.reduce((sum, point) => sum + point.value, 0);
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <EmptyState
      icon="chart"
      title="Belum ada data"
      description={label}
      className="py-8"
    />
  );
}

/** Grafik batang vertikal — dipakai untuk tren pengajuan surat per bulan. */
export function ColumnChart({
  data,
  tone = "blue",
  summary,
  emptyLabel,
}: {
  data: ChartSeries[];
  tone?: Tone;
  summary?: string;
  emptyLabel: string;
}) {
  const total = totalOf(data);
  if (total === 0) return <ChartEmpty label={emptyLabel} />;

  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div>
      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {data.map((point) => (
          <div
            key={point.label}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            title={`${point.label}: ${point.value}`}
          >
            <span className="text-xs font-semibold text-slate-700">
              {point.value}
            </span>
            <div
              className={`w-full max-w-[2.5rem] rounded-t-md ${BAR_TONES[tone]}`}
              style={{
                height:
                  point.value > 0
                    ? `${Math.max((point.value / max) * 82, 4)}%`
                    : "2px",
              }}
            />
            <span className="text-[11px] font-medium text-slate-500">
              {point.label}
            </span>
          </div>
        ))}
      </div>
      {summary && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {summary}
        </p>
      )}
    </div>
  );
}

/** Grafik batang horizontal — dipakai untuk sebaran status. */
export function BreakdownChart({
  data,
  tones = ["blue", "green", "red", "amber", "violet"],
  emptyLabel,
}: {
  data: ChartSeries[];
  tones?: Tone[];
  emptyLabel: string;
}) {
  const total = totalOf(data);
  if (total === 0) return <ChartEmpty label={emptyLabel} />;

  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <ul className="space-y-4">
      {data.map((point, index) => {
        const tone = tones[index % tones.length];
        const share = total > 0 ? Math.round((point.value / total) * 100) : 0;
        return (
          <li key={point.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-slate-700">
                {point.label}
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                <strong className="text-sm font-semibold text-slate-900">
                  {point.value}
                </strong>{" "}
                ({share}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${SOLID_TONES[tone]}`}
                style={{
                  width: `${Math.max((point.value / max) * 100, point.value > 0 ? 3 : 0)}%`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
