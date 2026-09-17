"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ForemanHeader, ForemanScreen, ForemanCard, BigButton, Stepper, Spinner, FullScreenMessage } from "@/components/foreman/ui";

type RosterItem = {
  id: string;
  type: "TOOL" | "CONSUMABLE";
  name: string;
  catalogId: string | null;
  unit: string | null;
  colorRequired: boolean;
  foremanAdded: boolean;
  lastQuantity: number | null;
  lastColor: string | null;
};

type CatalogItem = { id: string; name: string; unit: string | null; colorRequired: boolean };

type MaterialRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DELIVERED";
  requestedQty: number;
  unit: string | null;
  catalog: { name: string } | null;
  jobSiteItem: { name: string } | null;
  customItemName: string | null;
};

const COLOR_PRESETS = ["White", "Custom"];

export default function ForemanReportPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const [roster, setRoster] = useState<RosterItem[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);

  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [newToolName, setNewToolName] = useState("");
  const [newTools, setNewTools] = useState<string[]>([]);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [colorCustom, setColorCustom] = useState<Record<string, string>>({});

  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<{ id: string; name: string; base64: string; dataUrl: string; pending: boolean }[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqItem, setReqItem] = useState("");
  const [reqQty, setReqQty] = useState("");
  const [reqNote, setReqNote] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function loadAll() {
    fetch(`/api/jobs/${jobId}/site-items`).then((r) => r.json()).then((items: RosterItem[]) => {
      setRoster(items);
      const pres: Record<string, boolean> = {};
      const qty: Record<string, number> = {};
      const col: Record<string, string> = {};
      items.forEach((it) => {
        if (it.type === "TOOL") pres[it.id] = true;
        else {
          qty[it.id] = it.lastQuantity ?? 0;
          if (it.lastColor) col[it.id] = it.lastColor;
        }
      });
      setPresence(pres);
      setQuantities(qty);
      setColors(col);
    });
    fetch("/api/material-catalog").then((r) => r.json()).then(setCatalog);
    fetch(`/api/material-requests?jobId=${jobId}`).then((r) => r.json()).then(setRequests);
  }
  useEffect(loadAll, [jobId]);

  const tools = useMemo(() => (roster ?? []).filter((r) => r.type === "TOOL"), [roster]);
  const consumables = useMemo(() => (roster ?? []).filter((r) => r.type === "CONSUMABLE"), [roster]);

  function addPhoto(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (photos.length >= 6) { setError("Maximum 6 photos per report."); return; }
    const id = "p" + Date.now() + Math.random().toString(36).slice(2, 6);
    setPhotos((p) => [...p, { id, name: file.name, base64: "", dataUrl: "", pending: true }]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 1400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL("image/jpeg", 0.7);
        setPhotos((p) => p.map((x) => (x.id === id ? { ...x, dataUrl, base64: dataUrl.split(",")[1], pending: false } : x)));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function requestMaterial() {
    if (!reqItem.trim() || !reqQty) return;
    const existingCatalog = catalog.find((c) => c.name === reqItem);
    await fetch("/api/material-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        catalogId: existingCatalog?.id ?? undefined,
        customItemName: existingCatalog ? undefined : reqItem.trim(),
        requestedQty: Number(reqQty),
        unit: existingCatalog?.unit ?? undefined,
        note: reqNote || undefined,
      }),
    });
    setReqItem(""); setReqQty(""); setReqNote(""); setShowRequestForm(false);
    fetch(`/api/material-requests?jobId=${jobId}`).then((r) => r.json()).then(setRequests);
  }

  async function confirmDelivered(id: string, requestedQty: number) {
    const qtyStr = window.prompt("How much actually arrived?", String(requestedQty));
    if (!qtyStr) return;
    const res = await fetch(`/api/material-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deliver", deliveredQty: Number(qtyStr) }),
    });
    if (res.ok) {
      loadAll();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not confirm delivery.");
    }
  }

  async function submit() {
    setError("");
    if (photos.some((p) => p.pending)) { setError("Photos still processing — wait a second and try again."); return; }

    for (const c of consumables) {
      if (c.colorRequired) {
        const mode = colors[c.id];
        const val = mode === "Custom" ? colorCustom[c.id] : mode;
        if (!val?.trim()) { setError(`${c.name} needs a colour selected.`); return; }
      }
    }

    setSubmitting(true);
    const payload = {
      toolConfirmations: tools.map((t) => ({ jobSiteItemId: t.id, present: presence[t.id] ?? true })),
      newTools: newTools.map((name) => ({ name })),
      consumables: consumables.map((c) => ({
        jobSiteItemId: c.id,
        quantity: quantities[c.id] ?? 0,
        color: c.colorRequired ? (colors[c.id] === "Custom" ? colorCustom[c.id] : colors[c.id]) : undefined,
      })),
      notes,
      photos: photos.filter((p) => p.base64).map((p) => ({ filename: p.name, contentType: "image/jpeg", base64: p.base64 })),
    };

    const res = await fetch(`/api/foreman/jobs/${jobId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not save the report.");
    }
  }

  if (done) {
    return (
      <ForemanScreen>
        <ForemanHeader title="Report sent" backHref={`/foreman/jobs/${jobId}`} />
        <FullScreenMessage
          title="✓ Saved"
          body="Today's report is logged."
          action={<BigButton href={`/foreman/jobs/${jobId}`} variant="primary">Back to job</BigButton>}
        />
      </ForemanScreen>
    );
  }

  if (!roster) {
    return (
      <ForemanScreen>
        <ForemanHeader title="Today's Report" backHref={`/foreman/jobs/${jobId}`} />
        <div className="py-16"><Spinner /></div>
      </ForemanScreen>
    );
  }

  return (
    <ForemanScreen>
      <ForemanHeader title="Today's Report" backHref={`/foreman/jobs/${jobId}`} />
      <div className="p-4 space-y-4 pb-28">
        {error && <p className="bg-red-100 text-red-700 font-medium rounded-xl px-4 py-3">{error}</p>}

        {/* TOOLS */}
        <ForemanCard>
          <h2 className="font-bold text-lg mb-1">Tools & Equipment</h2>
          <p className="text-sm text-gray-500 mb-3">Tap to mark anything that&apos;s NOT here today.</p>
          <div className="space-y-2">
            {tools.length === 0 && newTools.length === 0 && <p className="text-sm text-gray-400">Nothing on the list yet.</p>}
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPresence((p) => ({ ...p, [t.id]: !p[t.id] }))}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border-2 font-semibold text-left ${
                  presence[t.id] ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"
                }`}
              >
                <span>{t.name}</span>
                <span>{presence[t.id] ? "✓ Here" : "✗ Not here"}</span>
              </button>
            ))}
            {newTools.map((name, i) => (
              <div key={i} className="w-full flex items-center justify-between rounded-xl px-4 py-3 border-2 bg-green-50 border-green-300 text-green-800 font-semibold">
                <span>{name} <span className="text-xs font-normal">(new)</span></span>
                <button type="button" onClick={() => setNewTools((n) => n.filter((_, idx) => idx !== i))} className="text-red-500 text-sm font-bold px-2">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              placeholder="Tool not on the list…"
              className="flex-1 min-h-[48px] px-3 border-2 border-gray-200 rounded-xl"
            />
            <button
              type="button"
              onClick={() => { if (newToolName.trim()) { setNewTools((n) => [...n, newToolName.trim()]); setNewToolName(""); } }}
              className="px-4 rounded-xl bg-orange-600 text-white font-bold"
            >
              Add
            </button>
          </div>
        </ForemanCard>

        {/* CONSUMABLES */}
        <ForemanCard>
          <h2 className="font-bold text-lg mb-1">Materials on Site</h2>
          <p className="text-sm text-gray-500 mb-3">How much of each is on site right now.</p>
          <div className="space-y-4">
            {consumables.length === 0 && <p className="text-sm text-gray-400">Nothing on the list yet.</p>}
            {consumables.map((c) => (
              <div key={c.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold">{c.name}{c.unit ? ` (${c.unit})` : ""}</span>
                  <Stepper value={quantities[c.id] ?? 0} onChange={(v) => setQuantities((q) => ({ ...q, [c.id]: v }))} />
                </div>
                {c.colorRequired && (
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setColors((cl) => ({ ...cl, [c.id]: preset }))}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${
                          colors[c.id] === preset ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    {colors[c.id] === "Custom" && (
                      <input
                        value={colorCustom[c.id] ?? ""}
                        onChange={(e) => setColorCustom((cc) => ({ ...cc, [c.id]: e.target.value }))}
                        placeholder="Colour name"
                        className="min-h-[40px] px-3 border-2 border-gray-200 rounded-xl flex-1 min-w-[140px]"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ForemanCard>

        {/* MATERIAL REQUESTS */}
        <ForemanCard>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Need More Material?</h2>
            <button type="button" onClick={() => setShowRequestForm((s) => !s)} className="text-orange-700 font-bold text-sm">
              {showRequestForm ? "Cancel" : "+ Request"}
            </button>
          </div>

          {showRequestForm && (
            <div className="space-y-2 mb-3 bg-orange-50 rounded-xl p-3">
              <input value={reqItem} onChange={(e) => setReqItem(e.target.value)} list="catalogNames" placeholder="What's needed?" className="w-full min-h-[48px] px-3 border-2 border-gray-200 rounded-xl" />
              <datalist id="catalogNames">{catalog.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              <input value={reqQty} onChange={(e) => setReqQty(e.target.value)} inputMode="decimal" placeholder="How much?" className="w-full min-h-[48px] px-3 border-2 border-gray-200 rounded-xl" />
              <input value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="Note (optional)" className="w-full min-h-[48px] px-3 border-2 border-gray-200 rounded-xl" />
              <button type="button" onClick={requestMaterial} className="w-full bg-orange-600 text-white font-bold rounded-xl py-3">Send Request</button>
            </div>
          )}

          {requests.length > 0 && (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                  <span>{r.catalog?.name ?? r.jobSiteItem?.name ?? r.customItemName} × {r.requestedQty}{r.unit ?? ""}</span>
                  {r.status === "PENDING" && <span className="text-xs font-bold text-amber-600">Awaiting approval</span>}
                  {r.status === "APPROVED" && (
                    <button onClick={() => confirmDelivered(r.id, r.requestedQty)} className="text-xs font-bold bg-green-600 text-white rounded-full px-3 py-1.5">
                      Confirm Delivered
                    </button>
                  )}
                  {r.status === "REJECTED" && <span className="text-xs font-bold text-red-600">Rejected</span>}
                  {r.status === "DELIVERED" && <span className="text-xs font-bold text-green-600">Delivered</span>}
                </div>
              ))}
            </div>
          )}
        </ForemanCard>

        {/* NOTES */}
        <ForemanCard>
          <h2 className="font-bold text-lg mb-2">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything the office should know…"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl"
          />
        </ForemanCard>

        {/* PHOTOS */}
        <ForemanCard>
          <h2 className="font-bold text-lg mb-2">Photos</h2>
          <label className="inline-block bg-orange-100 text-orange-700 font-bold rounded-xl px-4 py-3">
            📷 Take a photo
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { Array.from(e.target.files ?? []).forEach(addPhoto); e.target.value = ""; }} />
          </label>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100">
                {p.dataUrl && <img src={p.dataUrl} className="w-full h-full object-cover" alt="" />}
                {p.pending && <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500">…</div>}
                <button
                  type="button"
                  onClick={() => setPhotos((ph) => ph.filter((x) => x.id !== p.id))}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </ForemanCard>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-orange-100 p-3">
        <BigButton onClick={submit} disabled={submitting} variant="primary">
          {submitting ? "Saving…" : "Submit Report"}
        </BigButton>
      </div>
    </ForemanScreen>
  );
}
