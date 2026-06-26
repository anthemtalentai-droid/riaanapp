"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AppShell from "@/components/AppShell";
import Link from "next/link";

interface WeeklyReport {
  stats: { newLeads: number; jobsInProgress: number; jobsAwaitingInvoice: number; recentReports: number };
  activeJobs: { id: string; siteAddress: string; serviceCategory: string; lead: { clientName: string } | null }[];
  leadsThisWeek: { id: string; clientName: string; source: string; status: string }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = (session?.user as any) ?? {};
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    if (user.role !== "FOREMAN") {
      fetch("/api/weekly-report").then((r) => r.json()).then(setReport);
    }
  }, [user.role]);

  if (user.role === "FOREMAN") {
    return (
      <AppShell>
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-1">Good day, {user.name?.split(" ")[0]}.</h1>
          <p className="text-gray-500 mb-6">View your assigned jobs below.</p>
          <Link href="/jobs" className="btn-primary">View My Jobs</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-gray-500 mb-6 text-sm">Ritriwill Holdings · CW Painters</p>

        {report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="New leads (7 days)" value={report.stats.newLeads} href="/leads" color="blue" />
              <StatCard label="Jobs in progress" value={report.stats.jobsInProgress} href="/jobs" color="green" />
              <StatCard label="Awaiting invoice" value={report.stats.jobsAwaitingInvoice} href="/jobs" color="amber" />
              <StatCard label="Site reports (7 days)" value={report.stats.recentReports} href="/jobs" color="purple" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Active Jobs</h2>
                  <Link href="/jobs" className="text-sm text-blue-600 hover:underline">View all</Link>
                </div>
                <div className="space-y-2">
                  {report.activeJobs.length === 0 && <p className="text-sm text-gray-400">No active jobs.</p>}
                  {report.activeJobs.map((j) => (
                    <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {j.serviceCategory.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{j.lead?.clientName ?? "—"}</p>
                        <p className="text-xs text-gray-400 truncate">{j.siteAddress}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Leads this week</h2>
                  <Link href="/leads" className="text-sm text-blue-600 hover:underline">View all</Link>
                </div>
                <div className="space-y-2">
                  {report.leadsThisWeek.length === 0 && <p className="text-sm text-gray-400">No new leads this week.</p>}
                  {report.leadsThisWeek.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-2 rounded-lg">
                      <span className="text-sm font-medium">{l.clientName}</span>
                      <div className="flex gap-2">
                        <StatusBadge status={l.source} variant="gray" />
                        <StatusBadge status={l.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {!report && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            Loading…
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, href, color }: { label: string; value: number; href: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <Link href={href} className={`${colors[color]} rounded-xl p-5 hover:opacity-90 transition-opacity`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </Link>
  );
}

export function StatusBadge({ status, variant = "auto" }: { status: string; variant?: string }) {
  const colors: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700",
    CONTACTED: "bg-indigo-100 text-indigo-700",
    ACCEPTED: "bg-green-100 text-green-700",
    LOST: "bg-red-100 text-red-700",
    QUOTE_SENT: "bg-yellow-100 text-yellow-700",
    IN_PROGRESS: "bg-green-100 text-green-700",
    PENDING: "bg-gray-100 text-gray-600",
    COMPLETE: "bg-blue-100 text-blue-700",
    INVOICED: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-red-100 text-red-700",
    DRAFT: "bg-gray-100 text-gray-500",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
  };
  const cls = variant === "gray" ? "bg-gray-100 text-gray-500" : (colors[status] ?? "bg-gray-100 text-gray-500");
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status.replace(/_/g, " ")}</span>;
}
