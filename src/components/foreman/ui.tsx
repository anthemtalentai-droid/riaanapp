"use client";
// Shared building blocks for Foreman Mode (Objective 1). Deliberately
// different from the desktop AppShell look: bigger everything, high
// contrast, bold orange accent, minimal grey-on-grey — built to be usable
// one-handed, outdoors, on a cheap Android phone.

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ReactNode } from "react";

export const FOREMAN_ORANGE = "#EA580C"; // tailwind orange-600

export function ForemanHeader({
  title,
  subtitle,
  backHref,
  showSignOut,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  showSignOut?: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 bg-orange-600 text-white px-4 py-4 shadow-md">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref} className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 active:bg-white/25 text-2xl leading-none">
            ←
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-orange-100 truncate">{subtitle}</p>}
        </div>
        {showSignOut && (
          <button
            onClick={() => signOut({ callbackUrl: "/foreman/login" })}
            className="flex-shrink-0 text-xs font-semibold bg-white/15 active:bg-white/25 rounded-full px-3 py-2"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}

export function ForemanScreen({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-orange-50 pb-10">{children}</div>;
}

export function BigButton({
  children,
  onClick,
  href,
  variant = "primary",
  disabled,
  sub,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "success" | "muted";
  disabled?: boolean;
  sub?: string;
  icon?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-orange-600 active:bg-orange-700 text-white",
    secondary: "bg-white border-2 border-orange-600 text-orange-700 active:bg-orange-50",
    danger: "bg-red-600 active:bg-red-700 text-white",
    success: "bg-green-600 active:bg-green-700 text-white",
    muted: "bg-gray-200 text-gray-400",
  };
  const cls = `w-full flex items-center gap-3 rounded-2xl px-5 py-5 text-lg font-bold shadow-sm transition-colors min-h-[64px] ${styles[variant]} ${disabled ? "opacity-50 pointer-events-none" : ""}`;
  const content = (
    <>
      {icon && <span className="text-2xl flex-shrink-0" aria-hidden>{icon}</span>}
      <span className="flex-1 text-left">
        <span className="block">{children}</span>
        {sub && <span className="block text-sm font-normal opacity-80 mt-0.5">{sub}</span>}
      </span>
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  );
}

export function ForemanCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-orange-100 shadow-sm p-4 ${className}`}>{children}</div>;
}

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-0 flex-shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, round2(value - 1)))}
        className="w-12 h-12 rounded-l-xl bg-orange-100 active:bg-orange-200 text-orange-700 text-2xl font-bold flex items-center justify-center"
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 h-12 text-center text-lg font-bold border-y-2 border-orange-100 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(round2(value + 1))}
        className="w-12 h-12 rounded-r-xl bg-orange-100 active:bg-orange-200 text-orange-700 text-2xl font-bold flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function Spinner() {
  return <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />;
}

export function FullScreenMessage({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20 gap-3">
      <p className="text-xl font-bold text-gray-800">{title}</p>
      {body && <p className="text-gray-500">{body}</p>}
      {action}
    </div>
  );
}
