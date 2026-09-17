"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ForemanHeader, ForemanScreen, BigButton, Spinner } from "@/components/foreman/ui";

type JobHub = {
  siteAddress: string;
  clientName: string | null;
  hasWorksheet: boolean;
  loggedReportToday: boolean;
  someoneClockedIn: boolean;
  openUpliftBatch: boolean;
};

export default function ForemanJobHubPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobHub | null>(null);

  function refresh() {
    fetch(`/api/foreman/jobs/${jobId}`).then((r) => r.json()).then(setJob);
  }
  useEffect(refresh, [jobId]);

  if (!job) {
    return (
      <ForemanScreen>
        <ForemanHeader title="Loading…" backHref="/foreman" />
        <div className="py-16"><Spinner /></div>
      </ForemanScreen>
    );
  }

  return (
    <ForemanScreen>
      <ForemanHeader title={job.clientName ?? job.siteAddress} subtitle={job.siteAddress} backHref="/foreman" showSignOut />
      <div className="p-4 space-y-3">
        {job.loggedReportToday && (
          <p className="text-sm font-semibold text-green-700 bg-green-100 rounded-xl px-3 py-2 text-center">✓ Report logged today</p>
        )}

        <BigButton href={`/foreman/jobs/${jobId}/report`} icon="📝" sub={job.loggedReportToday ? "Add another update" : "Not logged yet today"}>
          Log Today&apos;s Report
        </BigButton>

        <BigButton
          href={`/foreman/jobs/${jobId}/clock`}
          icon="⏱"
          variant={job.someoneClockedIn ? "success" : "primary"}
          sub={job.someoneClockedIn ? "Crew on site" : "Clock your crew in/out"}
        >
          Clock In / Out
        </BigButton>

        <BigButton href={`/foreman/jobs/${jobId}/worksheet`} icon="📋" variant="secondary" disabled={!job.hasWorksheet} sub={job.hasWorksheet ? undefined : "Not ready yet"}>
          View Worksheet
        </BigButton>

        <BigButton
          href={`/foreman/jobs/${jobId}/uplift`}
          icon="📦"
          variant={job.openUpliftBatch ? "muted" : "secondary"}
          sub={job.openUpliftBatch ? "Waiting on office review" : "End of job — pack up & leave site"}
        >
          Uplift Site
        </BigButton>
      </div>
    </ForemanScreen>
  );
}
