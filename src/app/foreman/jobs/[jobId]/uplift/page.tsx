"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ForemanHeader, ForemanScreen, ForemanCard, BigButton, Spinner, FullScreenMessage } from "@/components/foreman/ui";

type RosterItem = { id: string; type: "TOOL" | "CONSUMABLE"; name: string };

export default function ForemanUpliftPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [hub, setHub] = useState<{ openUpliftBatch: boolean } | null>(null);
  const [roster, setRoster] = useState<RosterItem[] | null>(null);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function load() {
    fetch(`/api/foreman/jobs/${jobId}`).then((r) => r.json()).then(setHub);
    fetch(`/api/jobs/${jobId}/site-items`).then((r) => r.json()).then((items: RosterItem[]) => {
      setRoster(items);
      const p: Record<string, boolean> = {};
      items.forEach((i) => (p[i.id] = true));
      setPresent(p);
    });
  }
  useEffect(load, [jobId]);

  async function submit(allPresent: boolean) {
    setError(""); setMissing(null); setSubmitting(true);
    const items = (roster ?? []).map((r) => ({ jobSiteItemId: r.id, present: allPresent ? true : present[r.id] }));
    const res = await fetch(`/api/foreman/jobs/${jobId}/uplift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not submit the uplift.");
      if (j.missing) setMissing(j.missing);
    }
  }

  if (hub?.openUpliftBatch) {
    return (
      <ForemanScreen>
        <ForemanHeader title="Uplift Site" backHref={`/foreman/jobs/${jobId}`} />
        <FullScreenMessage title="Waiting on the office" body="Your uplift has been sent — the office still needs to check it off." />
      </ForemanScreen>
    );
  }

  if (done) {
    return (
      <ForemanScreen>
        <ForemanHeader title="Uplift Site" backHref={`/foreman/jobs/${jobId}`} />
        <FullScreenMessage
          title="✓ Sent to office"
          body="They'll confirm everything's accounted for."
          action={<BigButton href={`/foreman/jobs/${jobId}`} variant="primary">Back to job</BigButton>}
        />
      </ForemanScreen>
    );
  }

  return (
    <ForemanScreen>
      <ForemanHeader title="Uplift Site" backHref={`/foreman/jobs/${jobId}`} />
      <div className="p-4 space-y-4 pb-28">
        <p className="text-sm text-gray-600 bg-orange-100 rounded-xl px-3 py-2">
          Make sure today&apos;s report is already logged. Untick anything that&apos;s NOT actually leaving with you.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 rounded-xl px-4 py-3">
            <p className="font-semibold">{error}</p>
            {missing && (
              <ul className="list-disc ml-5 mt-1 text-sm">
                {missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}
          </div>
        )}

        {roster === null && <div className="py-16"><Spinner /></div>}
        {roster !== null && roster.length === 0 && <p className="text-center text-gray-500 py-10">Nothing on the roster.</p>}

        {roster && roster.length > 0 && (
          <ForemanCard>
            <div className="space-y-2">
              {roster.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPresent((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border-2 font-semibold text-left ${
                    present[r.id] ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"
                  }`}
                >
                  <span>{r.name} <span className="text-xs font-normal opacity-70">({r.type === "TOOL" ? "tool" : "material"})</span></span>
                  <span>{present[r.id] ? "✓ Leaving" : "✗ Not here"}</span>
                </button>
              ))}
            </div>
          </ForemanCard>
        )}
      </div>

      {roster && roster.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-orange-100 p-3 space-y-2">
          <BigButton onClick={() => submit(true)} disabled={submitting} variant="primary">
            {submitting ? "Sending…" : "Uplift All"}
          </BigButton>
          <BigButton onClick={() => submit(false)} disabled={submitting} variant="secondary">
            Submit with exceptions above
          </BigButton>
        </div>
      )}
    </ForemanScreen>
  );
}
