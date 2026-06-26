"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { StatusBadge } from "@/app/dashboard/page";
import Link from "next/link";

interface Lead {
  id: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  source: string;
  status: string;
  address: string | null;
  notes: string | null;
  createdAt: string;
  loggedBy: { name: string };
  job: { id: string; status: string } | null;
}

const SOURCES = ["PHONE", "WHATSAPP", "EMAIL", "WEBSITE", "REFERRAL", "OTHER"];
const STATUSES = ["NEW", "CONTACTED", "SITE_VISIT_BOOKED", "QUOTE_SENT", "ACCEPTED", "LOST"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientName: "", clientPhone: "", clientEmail: "", source: "PHONE", address: "", notes: "", status: "NEW" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch("/api/leads").then((r) => r.json()).then(setLeads); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const lead = await res.json();
    setLeads([lead, ...leads]);
    setShowForm(false);
    setForm({ clientName: "", clientPhone: "", clientEmail: "", source: "PHONE", address: "", notes: "", status: "NEW" });
    setSaving(false);
  }

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-gray-500 text-sm">{leads.length} total</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + New Lead
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold mb-4">Log New Lead</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Client Name *" required value={form.clientName} onChange={(v) => setForm({ ...form, clientName: v })} />
              <Field label="Phone" value={form.clientPhone} onChange={(v) => setForm({ ...form, clientPhone: v })} />
              <Field label="Email" type="email" value={form.clientEmail} onChange={(v) => setForm({ ...form, clientEmail: v })} />
              <SelectField label="Source *" value={form.source} options={SOURCES} onChange={(v) => setForm({ ...form, source: v })} />
              <div className="sm:col-span-2">
                <Field label="Site Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                  {saving ? "Saving…" : "Save Lead"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {leads.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">No leads yet. Log the first one above.</p>}
          {leads.map((lead) => (
            <div key={lead.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{lead.clientName}</span>
                  <StatusBadge status={lead.status} />
                  <StatusBadge status={lead.source} variant="gray" />
                </div>
                <p className="text-xs text-gray-400">{lead.address}</p>
                {lead.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lead.notes}</p>}
                <p className="text-xs text-gray-400 mt-1">Logged by {lead.loggedBy.name} · {new Date(lead.createdAt).toLocaleDateString("en-ZA")}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                {lead.job ? (
                  <Link href={`/jobs/${lead.job.id}`} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium hover:bg-green-200">
                    View Job
                  </Link>
                ) : (
                  <Link href={`/jobs?newFromLead=${lead.id}&clientName=${encodeURIComponent(lead.clientName)}&address=${encodeURIComponent(lead.address ?? "")}`}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium hover:bg-blue-200">
                    Build Quote
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
      </select>
    </div>
  );
}
