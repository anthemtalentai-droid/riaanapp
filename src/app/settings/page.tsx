"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const TABS = [
  { key: "foremen", label: "Foreman Access" },
  { key: "catalog", label: "Material Catalog" },
  { key: "requests", label: "Material Requests" },
  { key: "uplift", label: "Uplift Reconciliation" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("foremen");
  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-gray-500 mb-6">Foreman Mode access, material pricing, and site-item workflows.</p>

        <div className="border-b border-gray-200 mb-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "foremen" && <ForemanAccessTab />}
        {tab === "catalog" && <MaterialCatalogTab />}
        {tab === "requests" && <MaterialRequestsTab />}
        {tab === "uplift" && <UpliftReconciliationTab />}
      </div>
    </AppShell>
  );
}

// ─── Foreman Access ─────────────────────────────────────────────────────────

function ForemanAccessTab() {
  const [foremen, setForemen] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);

  function refresh() {
    fetch("/api/foremen-pin").then((r) => r.json()).then((d) => { setForemen(d); setLoading(false); });
  }
  useEffect(refresh, []);

  async function savePin(userId: string) {
    if (!/^\d{4}$/.test(pin)) { alert("PIN must be 4 digits."); return; }
    await fetch(`/api/foremen-pin/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    setEditing(null); setPin("");
    refresh();
  }

  async function toggleEnabled(userId: string, enabled: boolean) {
    const res = await fetch(`/api/foremen-pin/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinEnabled: enabled }) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || "Could not update."); }
    refresh();
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      <div className="p-4 bg-amber-50 border-b border-amber-100 text-sm text-amber-800 rounded-t-xl">
        Riaan wants to test Foreman Mode himself first — leave everyone&apos;s access off until he says go.
      </div>
      {foremen.length === 0 && <p className="p-4 text-sm text-gray-400">No foreman users found.</p>}
      {foremen.map((f) => (
        <div key={f.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-medium">{f.name}</p>
            <p className="text-xs text-gray-400">{f.email} · {f.hasPin ? "PIN set" : "No PIN set yet"}</p>
          </div>
          <div className="flex items-center gap-3">
            {editing === f.id ? (
              <>
                <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234"
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
                <button onClick={() => savePin(f.id)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                <button onClick={() => { setEditing(null); setPin(""); }} className="text-sm text-gray-400">Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(f.id)} className="text-sm text-blue-600 hover:underline">
                {f.hasPin ? "Change PIN" : "Set PIN"}
              </button>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.pinEnabled} onChange={(e) => toggleEnabled(f.id, e.target.checked)} disabled={!f.hasPin} />
              PIN login enabled
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Material Catalog ───────────────────────────────────────────────────────

function MaterialCatalogTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: "", unit: "", currentUnitPrice: "", colorRequired: false });

  function refresh() {
    fetch("/api/material-catalog").then((r) => r.json()).then((d) => { setItems(d); setLoading(false); });
  }
  useEffect(refresh, []);

  async function updatePrice(id: string, price: string) {
    await fetch(`/api/material-catalog/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentUnitPrice: price === "" ? null : Number(price) }) });
    refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    await fetch("/api/material-catalog", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newItem, currentUnitPrice: newItem.currentUnitPrice ? Number(newItem.currentUnitPrice) : null }),
    });
    setNewItem({ name: "", unit: "", currentUnitPrice: "", colorRequired: false });
    refresh();
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <form onSubmit={addItem} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
          <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="L" className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Price (R)</label>
          <input value={newItem.currentUnitPrice} onChange={(e) => setNewItem({ ...newItem, currentUnitPrice: e.target.value })} className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <label className="flex items-center gap-1.5 text-sm mb-2">
          <input type="checkbox" checked={newItem.colorRequired} onChange={(e) => setNewItem({ ...newItem, colorRequired: e.target.checked })} />
          Colour required
        </label>
        <button type="submit" className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg">+ Add</button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Unit</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Colour req.</th>
            <th className="px-4 py-2 text-right font-medium text-gray-600">Price (R)</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2">{it.name}</td>
                <td className="px-4 py-2 text-gray-500">{it.unit ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{it.colorRequired ? "Yes" : "—"}</td>
                <td className="px-4 py-2 text-right">
                  <PriceInput value={it.currentUnitPrice} onSave={(v) => updatePrice(it.id, v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceInput({ value, onSave }: { value: number | null; onSave: (v: string) => void }) {
  const [v, setV] = useState(value != null ? String(value) : "");
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== (value != null ? String(value) : "")) onSave(v); }}
      className="w-24 text-right px-2 py-1 border border-gray-200 rounded text-sm"
    />
  );
}

// ─── Material Requests ──────────────────────────────────────────────────────

function MaterialRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    fetch("/api/material-requests").then((r) => r.json()).then((d) => { setRequests(d); setLoading(false); });
  }
  useEffect(refresh, []);

  async function act(id: string, action: "approve" | "reject") {
    const rejectionReason = action === "reject" ? window.prompt("Reason for rejecting?") ?? "" : undefined;
    await fetch(`/api/material-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, rejectionReason }) });
    refresh();
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  const pending = requests.filter((r) => r.status === "PENDING");
  const others = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm mb-2">Awaiting approval ({pending.length})</h3>
        {pending.length === 0 && <p className="text-sm text-gray-400">Nothing pending.</p>}
        <div className="space-y-2">
          {pending.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-medium text-sm">{r.catalog?.name ?? r.jobSiteItem?.name ?? r.customItemName} × {r.requestedQty}{r.unit ?? ""}</p>
                <p className="text-xs text-gray-400">{r.job?.siteAddress} · requested by {r.requestedBy?.name}{r.note ? ` · "${r.note}"` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => act(r.id, "approve")} className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg">Approve</button>
                <button onClick={() => act(r.id, "reject")} className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded-lg">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">History</h3>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {others.map((r) => (
            <div key={r.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
              <span>{r.catalog?.name ?? r.jobSiteItem?.name ?? r.customItemName} × {r.requestedQty}{r.unit ?? ""} · {r.job?.siteAddress}</span>
              <span className={`text-xs font-semibold ${r.status === "DELIVERED" ? "text-green-600" : r.status === "REJECTED" ? "text-red-600" : "text-blue-600"}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Uplift Reconciliation ──────────────────────────────────────────────────

function UpliftReconciliationTab() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemStatus, setItemStatus] = useState<Record<string, { status: string; reason: string }>>({});

  function refresh() {
    fetch("/api/uplift-batches?status=SUBMITTED").then((r) => r.json()).then((d) => { setBatches(d); setLoading(false); });
  }
  useEffect(refresh, []);

  function setStatus(itemId: string, status: string) {
    setItemStatus((s) => ({ ...s, [itemId]: { status, reason: s[itemId]?.reason ?? "" } }));
  }
  function setReason(itemId: string, reason: string) {
    setItemStatus((s) => ({ ...s, [itemId]: { status: s[itemId]?.status ?? "PRESENT", reason } }));
  }

  async function complete(batch: any) {
    const items = batch.items.map((i: any) => ({
      id: i.id,
      status: itemStatus[i.id]?.status ?? "PRESENT",
      exceptionReason: itemStatus[i.id]?.reason,
    }));
    const needsReason = items.some((i: any) => i.status !== "PRESENT" && !i.exceptionReason?.trim());
    if (needsReason) { alert("Give a reason for anything not marked Present."); return; }
    const res = await fetch(`/api/uplift-batches/${batch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, complete: true }) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || "Could not complete."); return; }
    refresh();
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (batches.length === 0) return <p className="text-sm text-gray-400">Nothing waiting on reconciliation.</p>;

  return (
    <div className="space-y-4">
      {batches.map((b) => (
        <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">{b.job?.lead?.clientName ?? b.job?.siteAddress}</p>
              <p className="text-xs text-gray-400">Submitted by {b.submittedByForeman?.name} · {new Date(b.submittedAt).toLocaleString("en-ZA")}</p>
            </div>
            <button onClick={() => complete(b)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">Complete Reconciliation</button>
          </div>
          <div className="space-y-2">
            {b.items.map((i: any) => {
              const cur = itemStatus[i.id]?.status ?? i.status;
              return (
                <div key={i.id} className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                  <span className="text-sm flex-1 min-w-[140px]">{i.jobSiteItem?.name} <span className="text-xs text-gray-400">({i.jobSiteItem?.type})</span></span>
                  {["PRESENT", "MISSING", "EXCEPTION"].map((s) => (
                    <button key={s} onClick={() => setStatus(i.id, s)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cur === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600"}`}>
                      {s}
                    </button>
                  ))}
                  {cur !== "PRESENT" && (
                    <input placeholder="Reason" value={itemStatus[i.id]?.reason ?? ""} onChange={(e) => setReason(i.id, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded-lg flex-1 min-w-[140px]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
