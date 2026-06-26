"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { StatusBadge } from "@/app/dashboard/page";
import Link from "next/link";

export default function WeeklyReportPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetch("/api/weekly-report").then((r) => r.json()).then(setData); }, []);

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA");

  if (!data) return <AppShell><div className="p-4 text-gray-400">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Weekly Report</h1>
        <p className="text-sm text-gray-400 mb-6">
          {fmt(data.period.from)} — {fmt(data.period.to)}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "New leads", value: data.stats.newLeads, color: "bg-blue-50 text-blue-700" },
            { label: "Jobs in progress", value: data.stats.jobsInProgress, color: "bg-green-50 text-green-700" },
            { label: "Awaiting invoice", value: data.stats.jobsAwaitingInvoice, color: "bg-amber-50 text-amber-700" },
            { label: "Site reports", value: data.stats.recentReports, color: "bg-purple-50 text-purple-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-5`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold mb-4">Leads this week</h2>
            {data.leadsThisWeek.length === 0 && <p className="text-sm text-gray-400">No leads this week.</p>}
            <div className="space-y-2">
              {data.leadsThisWeek.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between text-sm py-1">
                  <span className="font-medium">{l.clientName}</span>
                  <div className="flex gap-1.5">
                    <StatusBadge status={l.source} variant="gray" />
                    <StatusBadge status={l.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold mb-4">Active Jobs</h2>
            {data.activeJobs.length === 0 && <p className="text-sm text-gray-400">No active jobs.</p>}
            <div className="space-y-2">
              {data.activeJobs.map((j: any) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-1 rounded flex-shrink-0 font-medium">
                    {j.serviceCategory.slice(0, 4)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{j.lead?.clientName ?? "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{j.siteAddress}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
          This report is currently rendered on-screen only. Email/WhatsApp automation is out of scope for this prototype.
          Wire up to a scheduled task (Resend / nodemailer) when ready.
        </div>
      </div>
    </AppShell>
  );
}
