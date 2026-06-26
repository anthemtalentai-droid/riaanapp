"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Link from "next/link";

const CATEGORIES = ["PAINTING", "WATERPROOFING", "DAMP_PROOFING", "RUBBERISING", "RENOVATIONS", "MAINTENANCE", "CONSTRUCTION"];

interface LineItem {
  id?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  isCustom: boolean;
  templateId?: string;
}

export default function QuoteBuilderPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [category, setCategory] = useState("PAINTING");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`).then((r) => r.json()).then((j) => {
      setJob(j);
      setCategory(j.serviceCategory ?? "PAINTING");
      setSiteAddress(j.siteAddress ?? "");
      setClientName(j.lead?.clientName ?? "");
      setClientEmail(j.lead?.clientEmail ?? "");
      setClientPhone(j.lead?.clientPhone ?? "");
    });
  }, [jobId]);

  useEffect(() => {
    fetch(`/api/price-templates?category=${category}`).then((r) => r.json()).then(setTemplates);
  }, [category]);

  function addFromTemplate(t: any) {
    setLineItems([...lineItems, { description: t.description, unit: t.unit ?? "", quantity: 1, unitPrice: t.unitPrice, isCustom: false, templateId: t.id }]);
  }

  function addCustom() {
    setLineItems([...lineItems, { description: "", unit: "", quantity: 1, unitPrice: 0, isCustom: true }]);
  }

  function updateItem(i: number, field: string, value: any) {
    setLineItems(lineItems.map((li, idx) => idx === i ? { ...li, [field]: value } : li));
  }

  function removeItem(i: number) {
    setLineItems(lineItems.filter((_, idx) => idx !== i));
  }

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  async function handleSave(accept: boolean) {
    if (!clientName || lineItems.length === 0) return;
    setSaving(true);

    const quoteRes = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        leadId: job?.lead?.id ?? null,
        serviceCategory: category,
        status: accept ? "ACCEPTED" : "DRAFT",
        clientName,
        clientEmail,
        clientPhone,
        siteAddress,
        notes,
        lineItems,
      }),
    });
    const quote = await quoteRes.json();

    if (accept) {
      // Link quote to job as accepted quote
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedQuoteId: quote.id, status: "IN_PROGRESS" }),
      });
    }

    setSaving(false);
    router.push(`/jobs/${jobId}`);
  }

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
          <Link href="/jobs">Jobs</Link>
          <span>/</span>
          <Link href={`/jobs/${jobId}`}>Job</Link>
          <span>/</span>
          <span>Quote Builder</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Quote Builder</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: line items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Client & job details */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold mb-4 text-sm">Client & Job Details</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Name *</label>
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Site Address</label>
                  <input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Service Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold mb-1 text-sm">Line Items</h2>
              <p className="text-xs text-gray-400 mb-4">Add from templates or add a custom line. All fields are editable.</p>

              {lineItems.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No items yet — add from templates or add a custom line below.</p>
              )}

              <div className="space-y-2 mb-4">
                {lineItems.map((li, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${li.isCustom ? "border-amber-200 bg-amber-50/40" : "border-gray-200"}`}>
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-12 sm:col-span-5">
                        {li.isCustom && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 rounded mb-1 inline-block">custom</span>}
                        <input
                          value={li.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                          placeholder="Description"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <input value={li.quantity} type="number" min={0} onChange={(e) => updateItem(i, "quantity", +e.target.value)}
                        placeholder="Qty"
                        className="col-span-4 sm:col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input value={li.unit} onChange={(e) => updateItem(i, "unit", e.target.value)}
                        placeholder="Unit"
                        className="col-span-4 sm:col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input value={li.unitPrice} type="number" min={0} onChange={(e) => updateItem(i, "unitPrice", +e.target.value)}
                        placeholder="Unit price"
                        className="col-span-4 sm:col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <div className="col-span-12 sm:col-span-1 flex items-center justify-between sm:justify-end">
                        <span className="text-sm font-medium sm:hidden">{fmt(li.quantity * li.unitPrice)}</span>
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs ml-2">✕</button>
                      </div>
                    </div>
                    <div className="hidden sm:flex justify-end mt-1">
                      <span className="text-sm font-medium text-gray-700">{fmt(li.quantity * li.unitPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={addCustom}
                  className="text-sm border border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
                  + Custom line
                </button>
              </div>

              {/* LiDAR stub */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <button disabled
                  title="Requires Admin or Salesman role + iPad with ARKit/RoomPlan — pending rollout"
                  className="text-sm text-gray-400 cursor-not-allowed flex items-center gap-2">
                  <span>📐</span>
                  <span>Scan with LiDAR (iPad — pending rollout)</span>
                </button>
                <p className="text-xs text-gray-400 mt-1">ARKit/RoomPlan integration pending. Will post measurements directly into quantity fields.</p>
              </div>
            </div>
          </div>

          {/* Right: templates + summary */}
          <div className="space-y-4">
            {/* Price templates */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-sm mb-3">Template Items — {category.replace(/_/g, " ")}</h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => addFromTemplate(t)}
                    className="w-full text-left p-2 rounded-lg hover:bg-blue-50 text-sm transition-colors group">
                    <div className="font-medium group-hover:text-blue-700">{t.description}</div>
                    <div className="text-xs text-gray-400">R{t.unitPrice} / {t.unit ?? "each"}</div>
                  </button>
                ))}
                {templates.length === 0 && <p className="text-xs text-gray-400">No templates for this category.</p>}
              </div>
            </div>

            {/* Quote summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
              <h3 className="font-semibold text-sm mb-3">Quote Summary</h3>
              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">VAT 15%</span><span>{fmt(vat)}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-2">
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={() => handleSave(true)} disabled={saving || !clientName || lineItems.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-40 transition-colors">
                  {saving ? "Saving…" : "Accept & Create Job"}
                </button>
                <button onClick={() => handleSave(false)} disabled={saving}
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg disabled:opacity-40">
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
