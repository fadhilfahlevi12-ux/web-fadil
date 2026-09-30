"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ICONS } from "@/components/icons";
import { cx } from "@/components/ui";

/**
 * Lonceng notifikasi pada header (PRD §3A).
 * Isinya dikirim dari server (sudah diformat) sehingga tidak ada permintaan
 * tambahan dari sisi klien; menutup panel dengan klik di luar atau Escape.
 */

export type NotificationItem = {
  id: string;
  title: string;
  detail: string | null;
  href: string;
  tone: "info" | "success" | "warn" | "danger";
  atLabel: string;
};

const TONE_DOT: Record<NotificationItem["tone"], string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
};

export function NotificationBell({
  items,
  dashboardHref,
}: {
  items: NotificationItem[];
  dashboardHref: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={count > 0 ? `Notifikasi: ${count} pembaruan` : "Notifikasi"}
        title="Notifikasi & pembaruan"
        className={cx(
          "relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700",
          open && "bg-slate-100 text-slate-700"
        )}
      >
        <ICONS.bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifikasi</p>
            <span className="text-[11px] text-slate-400">
              {count > 0 ? `${count} pembaruan` : "Tidak ada pembaruan"}
            </span>
          </div>

          {count === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">
              Belum ada notifikasi untuk Anda.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <span
                      className={cx(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        TONE_DOT[item.tone]
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800">
                        {item.title}
                      </span>
                      {item.detail && (
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                          {item.detail}
                        </span>
                      )}
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {item.atLabel}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={dashboardHref}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            Buka dasbor
          </Link>
        </div>
      )}
    </div>
  );
}
