"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { StatusBadge } from "@/app/dashboard/page";
import Link from "next/link";

interface Job {
  id: string;
  serviceCategory: string;
  status: string;
  siteAddress: string;
  startDate: string | null;
  lead: { clientName: string } | null;
  acceptedQuote: { total: number; quoteNumber: string } | null;
  salesman: { name: string } | null;
  foreman: { name: string } | null;
  _count: { invoices: number; dailyReports: number };
}

const CATEGORIES = ["PAINTING", "WATERPROOFING", "DAMP_PROOFING", "RUBBERISING", "RENOVATIONS", "MAINTENANCE", "CONSTRUCTION"];

function JobsContent() {
  const searchParams = useSearchParams();
  const newFromLead = searchParams.get("newFromLead");
  const prefillClientName = searchParams.get("clientName") ?? "";
  const prefillAddress = searchParams.get("address") ?? "";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ siteAddress: prefillAddress, serviceCategory: "PAINTING", leadId: newFromLead ?? "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/jobs").then((r) => r.json()).then(setJobs);
    if (newFromLead) setShowForm(true);
  }, [newFromLead]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const job = await res.json();
    setJobs([job, ...jobs]);
    setShowForm(false);
    setSaving(false);
  }

  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-gray-500 text-sm">{jobs.length} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + New Job
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold mb-4">Create Job {prefillClientName && `— ${prefillClientName}`}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Address *</label>
              <input required value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Category *</label>
              <select value={form.serviceCategory} onChange={(e) => setForm({ ...form, serviceCategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="flex gap-3 sm:col-span-2 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Creating…" : "Create Job"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {jobs.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">No jobs yet.</p>}
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">{job.lead?.clientName ?? "—"}</span>
                  <StatusBadge status={job.status} />
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.serviceCategory.replace(/_/g, " ")}</span>
                </div>
                <p className="text-xs text-gray-400">{job.siteAddress}</p>
                <div className="flex gap-3 mt-1 flex-wrap">
                  {job.foreman && <span className="text-xs text-gray-400">Foreman: {job.foreman.name}</span>}
                  {job.startDate && <span className="text-xs text-gray-400">Started: {new Date(job.startDate).toLocaleDateString("en-ZA")}</span>}
                  <span className="text-xs text-gray-400">{job._count.dailyReports} reports · {job._count.invoices} invoices</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {job.acceptedQuote && <p className="text-sm font-semibold text-gray-900">{fmt(job.acceptedQuote.total)}</p>}
                {job.acceptedQuote && <p className="text-xs text-gray-400">{job.acceptedQuote.quoteNumber}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="text-gray-400 p-4">Loading…</div>}>
        <JobsContent />
      </Suspense>
    </AppShell>
  );
}
