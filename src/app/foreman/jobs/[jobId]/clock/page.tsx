"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ForemanHeader, ForemanScreen, ForemanCard, Spinner } from "@/components/foreman/ui";

type WorkerRow = { id: string; name: string; clockedIn: boolean; clockInAt: string | null };

export default function ForemanClockPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [workers, setWorkers] = useState<WorkerRow[] | null>(null);
  const [clockOutFor, setClockOutFor] = useState<WorkerRow | null>(null);
  const [mileage, setMileage] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    fetch(`/api/foreman/jobs/${jobId}/workers`).then((r) => r.json()).then(setWorkers);
  }
  useEffect(refresh, [jobId]);

  async function clockIn(workerId: string) {
    setBusy(true);
    await fetch(`/api/foreman/jobs/${jobId}/clock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId, action: "clock-in" }),
    });
    setBusy(false);
    refresh();
  }

  async function submitClockOut() {
    if (!clockOutFor) return;
    setBusy(true);
    await fetch(`/api/foreman/jobs/${jobId}/clock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: clockOutFor.id, action: "clock-out", mileage: mileage || undefined, reason: reason || undefined }),
    });
    setBusy(false);
    setClockOutFor(null);
    setMileage("");
    setReason("");
    refresh();
  }

  return (
    <ForemanScreen>
      <ForemanHeader title="Clock In / Out" backHref={`/foreman/jobs/${jobId}`} />
      <div className="p-4 space-y-3">
        {workers === null && <div className="py-16"><Spinner /></div>}
        {workers !== null && workers.length === 0 && <p className="text-center text-gray-500 py-10">No crew set up yet.</p>}

        {workers?.map((w) => (
          <ForemanCard key={w.id} className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{w.name}</p>
              {w.clockedIn && w.clockInAt && (
                <p className="text-sm text-green-700 font-medium">On site since {new Date(w.clockInAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</p>
              )}
            </div>
            {w.clockedIn ? (
              <button disabled={busy} onClick={() => { setClockOutFor(w); setMileage(""); setReason(""); }} className="bg-red-600 active:bg-red-700 text-white font-bold rounded-xl px-5 py-3 min-h-[48px]">
                Clock Out
              </button>
            ) : (
              <button disabled={busy} onClick={() => clockIn(w.id)} className="bg-green-600 active:bg-green-700 text-white font-bold rounded-xl px-5 py-3 min-h-[48px]">
                Clock In
              </button>
            )}
          </ForemanCard>
        ))}
      </div>

      {clockOutFor && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20">
          <div className="bg-white rounded-t-3xl p-5 w-full space-y-3">
            <p className="font-bold text-lg">Clock out {clockOutFor.name}</p>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Kilometres travelled (optional)</label>
              <input value={mileage} onChange={(e) => setMileage(e.target.value)} inputMode="decimal" placeholder="e.g. 24" className="w-full min-h-[48px] px-3 border-2 border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Reason / note (optional)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. left early — doctor" className="w-full min-h-[48px] px-3 border-2 border-gray-200 rounded-xl" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setClockOutFor(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100">Cancel</button>
              <button onClick={submitClockOut} disabled={busy} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600">{busy ? "Saving…" : "Clock Out"}</button>
            </div>
          </div>
        </div>
      )}
    </ForemanScreen>
  );
}
