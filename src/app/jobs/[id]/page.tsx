"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AppShell from "@/components/AppShell";
import { StatusBadge } from "@/app/dashboard/page";
import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", roles: ["ADMIN", "SALESMAN", "FOREMAN"] },
  { key: "quote", label: "Quote", roles: ["ADMIN", "SALESMAN"] },
  { key: "worksheet", label: "Worksheet", roles: ["ADMIN", "SALESMAN", "FOREMAN"] },
  { key: "site-reports", label: "Site Reports", roles: ["ADMIN", "SALESMAN", "FOREMAN"] },
  { key: "time-clock", label: "Time Clock", roles: ["ADMIN", "SALESMAN", "FOREMAN"] },
  { key: "invoices", label: "Invoices", roles: ["ADMIN"] },
  { key: "profitability", label: "Profitability", roles: ["ADMIN"] },
];

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "ON_HOLD", "COMPLETE", "INVOICED", "CANCELLED"];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const user = (session?.user as any) ?? {};
  const [job, setJob] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/jobs/${id}`).then((r) => r.json()).then((d) => { setJob(d); setLoading(false); });
  }, [id]);

  const visibleTabs = TABS.filter((t) => t.roles.includes(user.role));

  if (loading) return <AppShell><div className="flex items-center gap-2 text-gray-400 p-4"><Spinner />Loading…</div></AppShell>;
  if (!job || job.error) return <AppShell><p className="p-4 text-red-600">Job not found.</p></AppShell>;

  async function updateStatus(status: string) {
    const res = await fetch(`/api/jobs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const updated = await res.json();
    setJob({ ...job, ...updated });
  }

  return (
    <AppShell>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link href="/jobs" className="text-sm text-gray-400 hover:text-gray-600">Jobs</Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium">{job.lead?.clientName ?? "Job"}</span>
            </div>
            <h1 className="text-2xl font-bold">{job.lead?.clientName ?? job.siteAddress}</h1>
            <p className="text-sm text-gray-500">{job.siteAddress}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <StatusBadge status={job.status} />
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.serviceCategory.replace(/_/g, " ")}</span>
            </div>
          </div>
          {user.role !== "FOREMAN" && (
            <div className="flex-shrink-0">
              <select value={job.status} onChange={(e) => updateStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 flex gap-1 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && <OverviewTab job={job} />}
        {tab === "quote" && <QuoteTab job={job} />}
        {tab === "worksheet" && <WorksheetTab job={job} />}
        {tab === "site-reports" && <SiteReportsTab job={job} jobId={id} onRefresh={() => fetch(`/api/jobs/${id}`).then((r) => r.json()).then(setJob)} />}
        {tab === "time-clock" && <TimeClockTab job={job} jobId={id} onRefresh={() => fetch(`/api/jobs/${id}`).then((r) => r.json()).then(setJob)} />}
        {tab === "invoices" && <InvoicesTab job={job} jobId={id} onRefresh={() => fetch(`/api/jobs/${id}`).then((r) => r.json()).then(setJob)} />}
        {tab === "profitability" && <ProfitabilityTab jobId={id} />}
      </div>
    </AppShell>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ job }: { job: any }) {
  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <InfoCard title="Job details">
        <Row label="Client" value={job.lead?.clientName ?? "—"} />
        <Row label="Site" value={job.siteAddress} />
        <Row label="Category" value={job.serviceCategory.replace(/_/g, " ")} />
        <Row label="Start date" value={job.startDate ? new Date(job.startDate).toLocaleDateString("en-ZA") : "—"} />
        <Row label="Salesman" value={job.salesman?.name ?? "—"} />
        <Row label="Foreman" value={job.foreman?.name ?? "—"} />
      </InfoCard>
      <InfoCard title="Financial summary">
        <Row label="Quote value" value={job.acceptedQuote ? fmt(job.acceptedQuote.total) : "No quote yet"} />
        <Row label="Invoices raised" value={`${job.invoices?.length ?? 0} invoice(s)`} />
        <Row label="Site reports" value={`${job.dailyReports?.length ?? 0} report(s)`} />
        <Row label="Time entries" value={`${job.timeEntries?.length ?? 0} entries`} />
        {job.clientSignOff && (
          <div className="mt-2 bg-green-50 rounded-lg p-3">
            <p className="text-sm font-medium text-green-700">Signed off by {job.clientSignOff.signedByName}</p>
            <p className="text-xs text-green-600">{new Date(job.clientSignOff.signedAt).toLocaleDateString("en-ZA")}</p>
          </div>
        )}
      </InfoCard>
    </div>
  );
}

// ─── Quote tab ────────────────────────────────────────────────────────────────

function QuoteTab({ job }: { job: any }) {
  const q = job.acceptedQuote;
  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  if (!q) return (
    <div className="text-center py-12">
      <p className="text-gray-400 mb-4">No accepted quote linked to this job.</p>
      <Link href={`/jobs/${job.id}/quote`} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
        Build Quote
      </Link>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">{q.quoteNumber}</h2>
          <p className="text-sm text-gray-500">{q.clientName} · {q.siteAddress}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={q.status} />
          <Link href={`/jobs/${job.id}/quote`} className="text-sm text-blue-600 hover:underline">Edit</Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Unit</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {q.lineItems.map((li: any) => (
              <tr key={li.id} className={li.isCustom ? "bg-amber-50/30" : ""}>
                <td className="px-4 py-3">
                  {li.description}
                  {li.isCustom && <span className="ml-2 text-xs bg-amber-100 text-amber-600 px-1.5 rounded">custom</span>}
                </td>
                <td className="px-4 py-3 text-right">{li.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-500">{li.unit ?? "—"}</td>
                <td className="px-4 py-3 text-right">{fmt(li.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(li.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr><td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">Subtotal</td><td className="px-4 py-2 text-right font-medium">{fmt(q.subtotal)}</td></tr>
            <tr><td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">VAT (15%)</td><td className="px-4 py-2 text-right font-medium">{fmt(q.vatAmount)}</td></tr>
            <tr><td colSpan={4} className="px-4 py-2 text-right text-sm font-semibold">Total</td><td className="px-4 py-2 text-right font-bold text-lg">{fmt(q.total)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Worksheet tab ────────────────────────────────────────────────────────────

function WorksheetTab({ job }: { job: any }) {
  const ws = job.worksheet;
  if (!ws) return <p className="text-gray-400 py-8">No worksheet generated yet. Accept a quote to auto-generate.</p>;

  let data: any = {};
  try { data = JSON.parse(ws.content); } catch {}

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-lg">Foreman Worksheet</h2>
          <p className="text-sm text-gray-500">{data.clientName} · {data.siteAddress}</p>
        </div>
        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium">FOREMAN COPY</span>
      </div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Scope of Work</h3>
        <div className="space-y-2">
          {(data.scope ?? []).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">{item.description}</span>
              <span className="text-sm font-medium text-gray-700 ml-4 flex-shrink-0">{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
      {data.specialInstructions && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-semibold text-blue-700 mb-1">SPECIAL INSTRUCTIONS</p>
          <p className="text-sm text-blue-800">{data.specialInstructions}</p>
        </div>
      )}
    </div>
  );
}

// ─── Site Reports tab ─────────────────────────────────────────────────────────

function SiteReportsTab({ job, jobId, onRefresh }: { job: any; jobId: string; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState([{ description: "", quantity: 1, unit: "L", unitCost: 0 }]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/daily-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, notes, materials: materials.filter((m) => m.description) }),
    });
    setShowForm(false);
    setNotes("");
    setMaterials([{ description: "", quantity: 1, unit: "L", unitCost: 0 }]);
    setSaving(false);
    onRefresh();
  }

  function addMaterial() { setMaterials([...materials, { description: "", quantity: 1, unit: "L", unitCost: 0 }]); }
  function updateMaterial(i: number, field: string, value: any) {
    setMaterials(materials.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Daily Site Reports</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
          + Log Report
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          {/* TODO — offline queue: save form state to IndexedDB and sync when online */}
          <h3 className="font-medium mb-3 text-sm">New Site Report — {new Date().toLocaleDateString("en-ZA")}</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="What was done today? Any issues?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Materials Used</label>
              <button type="button" onClick={addMaterial} className="text-xs text-blue-600 hover:underline">+ Add row</button>
            </div>
            <div className="space-y-2">
              {materials.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Description" value={m.description} onChange={(e) => updateMaterial(i, "description", e.target.value)}
                    className="col-span-5 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="number" placeholder="Qty" value={m.quantity} onChange={(e) => updateMaterial(i, "quantity", +e.target.value)}
                    className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input placeholder="Unit" value={m.unit} onChange={(e) => updateMaterial(i, "unit", e.target.value)}
                    className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="number" placeholder="Unit cost (R)" value={m.unitCost} onChange={(e) => updateMaterial(i, "unitCost", +e.target.value)}
                    className="col-span-3 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {saving ? "Saving…" : "Save Report"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {job.dailyReports?.length === 0 && <p className="text-gray-400 text-sm py-4">No reports yet.</p>}
        {job.dailyReports?.map((r: any) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{new Date(r.reportDate).toLocaleDateString("en-ZA")}</span>
              <span className="text-xs text-gray-400">by {r.loggedBy.name}</span>
            </div>
            {r.notes && <p className="text-sm text-gray-600 mb-3">{r.notes}</p>}
            {r.materials?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Materials</p>
                {r.materials.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{m.description} — {m.quantity} {m.unit}</span>
                    <span className="font-medium">{fmt(m.totalCost)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100 mt-1">
                  <span>Total materials</span>
                  <span>{fmt(r.materials.reduce((s: number, m: any) => s + m.totalCost, 0))}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Time clock tab ───────────────────────────────────────────────────────────

function TimeClockTab({ job, jobId, onRefresh }: { job: any; jobId: string; onRefresh: () => void }) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workers").then((r) => r.json()).then((w) => { setWorkers(w); setLoading(false); });
  }, []);

  const openEntries = job.timeEntries?.filter((e: any) => !e.clockOut) ?? [];
  const isClocked = (workerId: string) => openEntries.some((e: any) => e.worker.id === workerId);

  async function clockAction(workerId: string, action: "clock-in" | "clock-out") {
    await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, workerId, action }),
    });
    onRefresh();
  }

  const fmtHrs = (h: number | null) => h != null ? `${h.toFixed(1)} hrs` : "—";

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold">Time Clock</h2>
          {/* Stub note: facial-recognition kiosk (Jibble/SmartBarrel) will write to the same TimeEntry records */}
          <p className="text-xs text-gray-400 mt-0.5">Manual entry — kiosk integration pending</p>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-2 mb-6">
          {workers.map((w) => {
            const clocked = isClocked(w.id);
            return (
              <div key={w.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-gray-400">R{w.wageRates?.[0]?.ratePerHour ?? "—"}/hr</p>
                </div>
                <div className="flex items-center gap-3">
                  {clocked && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">On site</span>}
                  <button
                    onClick={() => clockAction(w.id, clocked ? "clock-out" : "clock-in")}
                    className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${clocked ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                    {clocked ? "Clock Out" : "Clock In"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="font-medium text-sm mb-3">All Time Entries</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {job.timeEntries?.length === 0 && <p className="p-4 text-sm text-gray-400">No entries yet.</p>}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr>
            <th className="px-4 py-2 font-medium text-gray-600">Worker</th>
            <th className="px-4 py-2 font-medium text-gray-600">Clock In</th>
            <th className="px-4 py-2 font-medium text-gray-600">Clock Out</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">Hours</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {job.timeEntries?.map((e: any) => (
              <tr key={e.id}>
                <td className="px-4 py-2">{e.worker.name}</td>
                <td className="px-4 py-2 text-gray-600">{new Date(e.clockIn).toLocaleString("en-ZA")}</td>
                <td className="px-4 py-2 text-gray-600">{e.clockOut ? new Date(e.clockOut).toLocaleString("en-ZA") : <span className="text-green-600">On site</span>}</td>
                <td className="px-4 py-2 text-right font-medium">{fmtHrs(e.hoursWorked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Invoices tab ─────────────────────────────────────────────────────────────

function InvoicesTab({ job, jobId, onRefresh }: { job: any; jobId: string; onRefresh: () => void }) {
  const [entities, setEntities] = useState<any[]>([]);
  const [drawSchedule, setDrawSchedule] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyEntityId: "", type: "DEPOSIT", drawStageLabel: "", drawPercentage: 0, subtotal: 0, notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/company-entities").then((r) => r.json()).then((e) => {
      setEntities(e);
      if (e[0]) setForm((f) => ({ ...f, companyEntityId: e[0].id }));
    });
    fetch(`/api/draw-schedules/${job.serviceCategory}`).then((r) => r.json()).then(setDrawSchedule);
  }, [job.serviceCategory]);

  const quoteTotal = job.acceptedQuote?.total ?? 0;
  const subFromPct = (pct: number) => Math.round((quoteTotal / 1.15) * (pct / 100) * 100) / 100;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, jobId }),
    });
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Invoices</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
          + New Invoice
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="font-medium mb-3 text-sm">Create Invoice</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice from (entity)</label>
              <select value={form.companyEntityId} onChange={(e) => setForm({ ...form, companyEntityId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {entities.map((e) => <option key={e.id} value={e.id}>{e.tradingAs ?? e.legalName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["DEPOSIT", "STAGE", "FINAL", "VARIATION"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {drawSchedule && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Draw stage (from schedule)</label>
              <div className="flex flex-wrap gap-2">
                {drawSchedule.stages.map((s: any) => (
                  <button key={s.id} type="button"
                    onClick={() => setForm({ ...form, drawStageLabel: s.label, drawPercentage: s.percentage, subtotal: subFromPct(s.percentage) })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                      ${form.drawStageLabel === s.label ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:border-blue-400"}`}>
                    {s.label} — {s.percentage}%
                  </button>
                ))}
              </div>
              {/* PLACEHOLDER — draw percentages; confirm with Riaan before go-live */}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal (excl. VAT) R</label>
              <input type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: +e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-sm text-gray-500 mb-1">Total incl. VAT:</p>
              <p className="font-bold text-lg">{fmt(form.subtotal * 1.15)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {saving ? "Creating…" : "Create Invoice"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {job.invoices?.length === 0 && <p className="text-sm text-gray-400 py-4">No invoices yet.</p>}
        {job.invoices?.map((inv: any) => (
          <div key={inv.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{inv.invoiceNumber}</span>
                  <StatusBadge status={inv.status} />
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{inv.type}</span>
                </div>
                <p className="text-xs text-gray-400">{inv.companyEntity?.tradingAs ?? inv.companyEntity?.legalName} · {inv.drawStageLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{fmt(inv.total)}</p>
                <p className="text-xs text-gray-400">excl. VAT: {fmt(inv.subtotal)}</p>
                {inv.amountPaid > 0 && <p className="text-xs text-green-600">Paid: {fmt(inv.amountPaid)}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profitability tab ────────────────────────────────────────────────────────

function ProfitabilityTab({ jobId }: { jobId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetch(`/api/profitability/${jobId}`).then((r) => r.json()).then(setData); }, [jobId]);

  if (!data) return <div className="flex items-center gap-2 text-gray-400"><Spinner />Computing…</div>;

  const fmt = (n: number, pct?: boolean) =>
    pct ? `${n.toFixed(1)}%` : `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <div className="max-w-2xl">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <strong>Note:</strong> These formulas are provisional — confirm exact definitions with Riaan before treating as final.
        See <code className="text-xs bg-amber-100 px-1 rounded">src/lib/profitability.ts</code> for the calculation module.
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <ProfitCard label="On-site Profit" value={fmt(data.onSiteProfit)} sub="revenue − materials − labour" highlight={data.onSiteProfit >= 0} />
        <ProfitCard label="Profit per Day" value={fmt(data.onSiteProfitPerDay)} sub={`over ${data.daysOnSite} days on site`} />
        <ProfitCard label="Profit %" value={fmt(data.onSiteProfitPct, true)} sub="of revenue" highlight={data.onSiteProfitPct >= 0} />
        <ProfitCard label="Realised Profit" value={fmt(data.realisedProfit)} sub="based on amount paid" highlight={data.realisedProfit >= 0} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold mb-3 text-sm">Cost breakdown</h3>
        <div className="space-y-2 text-sm">
          <Row label="Revenue (quote total)" value={fmt(data.revenue)} />
          <Row label="Materials cost" value={fmt(data.materialsTotal)} />
          <Row label="Labour cost" value={fmt(data.labourTotal)} />
          <Row label="Invoiced total" value={fmt(data.invoicesTotal)} />
          <Row label="Amount paid" value={fmt(data.amountPaid)} />
        </div>
      </div>
    </div>
  );
}

function ProfitCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${highlight === undefined ? "bg-gray-50 border-gray-200" : highlight ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight === undefined ? "text-gray-900" : highlight ? "text-green-700" : "text-red-700"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold mb-3 text-sm">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function Spinner() {
  return <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />;
}
