"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ForemanHeader, ForemanScreen, ForemanCard, Spinner, FullScreenMessage } from "@/components/foreman/ui";

type Worksheet = {
  clientName?: string;
  siteAddress?: string;
  scope?: { description: string; quantity: string }[];
  specialInstructions?: string;
};

export default function ForemanWorksheetPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [data, setData] = useState<Worksheet | null | "none">(null);

  useEffect(() => {
    fetch(`/api/foreman/jobs/${jobId}/worksheet`).then((r) => {
      if (!r.ok) { setData("none"); return; }
      r.json().then(setData);
    });
  }, [jobId]);

  return (
    <ForemanScreen>
      <ForemanHeader title="Worksheet" backHref={`/foreman/jobs/${jobId}`} />
      <div className="p-4 space-y-3">
        {data === null && <div className="py-16"><Spinner /></div>}
        {data === "none" && <FullScreenMessage title="No worksheet yet" body="The office hasn't generated one for this job." />}

        {data && data !== "none" && (
          <>
            <ForemanCard>
              <p className="text-xs font-bold uppercase text-orange-600 tracking-wide mb-2">Scope of Work</p>
              <div className="space-y-2">
                {(data.scope ?? []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-3">
                    <span className="font-medium">{item.description}</span>
                    <span className="font-bold text-orange-700 flex-shrink-0 ml-3">{item.quantity}</span>
                  </div>
                ))}
                {(data.scope ?? []).length === 0 && <p className="text-gray-400 text-sm">No line items.</p>}
              </div>
            </ForemanCard>

            {data.specialInstructions && (
              <ForemanCard className="bg-blue-50 border-blue-200">
                <p className="text-xs font-bold uppercase text-blue-700 tracking-wide mb-1">Special Instructions</p>
                <p className="text-blue-900">{data.specialInstructions}</p>
              </ForemanCard>
            )}
          </>
        )}
      </div>
    </ForemanScreen>
  );
}
