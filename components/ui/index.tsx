import type { ReactNode } from "react";
import Link from "next/link";

import { ICONS } from "@/components/icons";
import type { NavIcon, RoleNavItem } from "@/lib/navigation";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        BADGE_TONES[tone] ?? BADGE_TONES.neutral
      )}
    >
      {children}
    </span>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cx("px-5 py-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  children,
  className = "",
}: {
  icon?: NavIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center",
        className
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

const STAT_TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  violet: "bg-violet-50 text-violet-600",
};

export function StatCard({
  label,
  value = "—",
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  icon?: NavIcon;
  tone?: keyof typeof STAT_TONES;
}) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              STAT_TONES[tone] ?? STAT_TONES.blue
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function ModuleCard({
  item,
  tone = "blue",
}: {
  item: RoleNavItem;
  tone?: keyof typeof STAT_TONES;
}) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div
        className={cx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          STAT_TONES[tone] ?? STAT_TONES.blue
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900 group-hover:text-blue-700">
          {item.label}
        </p>
        <p className="mt-1 text-sm leading-snug text-slate-500">
          {item.description}
        </p>
      </div>
    </Link>
  );
}

const CALLOUT_TONES: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function Callout({
  tone = "info",
  children,
}: {
  tone?: keyof typeof CALLOUT_TONES;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        CALLOUT_TONES[tone] ?? CALLOUT_TONES.info
      )}
    >
      {children}
    </div>
  );
}

const BUTTON_VARIANTS: Record<string, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-300",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  icon,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: NavIcon;
}) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <Link
      href={href}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant])}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  );
}

/**
 * Tombol unduhan berkas (mis. ekspor laporan Excel/PDF).
 * Memakai <a download> agar peramban langsung menyimpan berkas dari route API.
 */
export function DownloadButton({
  href,
  children,
  variant = "primary",
  icon = "download",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: NavIcon;
}) {
  const Icon = ICONS[icon];
  return (
    <a
      href={href}
      download
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant])}
    >
      <Icon className="h-4 w-4" />
      {children}
    </a>
  );
}

export function StepList({
  steps,
}: {
  steps: { title: string; description?: string }[];
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-xl bg-slate-50 p-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">{step.title}</p>
            {step.description && (
              <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
