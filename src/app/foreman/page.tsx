"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ForemanHeader, ForemanScreen, ForemanCard, Spinner, FullScreenMessage } from "@/components/foreman/ui";

type JobCard = {
  id: string;
  siteAddress: string;
  status: string;
  serviceCategory: string;
  lead: { clientName: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
};

export default function ForemanLandingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<JobCard[] | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch("/api/foreman/jobs")
      .then((r) => r.json())
      .then((data: JobCard[]) => {
        if (Array.isArray(data) && data.length === 1) {
          setRedirecting(true);
          router.replace(`/foreman/jobs/${data[0].id}`);
          return;
        }
        setJobs(data);
      });
  }, [router]);

  const name = (session?.user as any)?.name ?? "";

  return (
    <ForemanScreen>
      <ForemanHeader title={name ? `Hi, ${name.split(" ")[0]}` : "Your jobs"} subtitle="Pick a site" showSignOut />
      <div className="p-4 space-y-3">
        {(jobs === null || redirecting) && <div className="py-16"><Spinner /></div>}

        {jobs !== null && !redirecting && jobs.length === 0 && (
          <FullScreenMessage title="No active jobs" body="You don't have a job assigned right now. Check with the office." />
        )}

        {jobs !== null && !redirecting && jobs.length > 1 && jobs.map((j) => (
          <Link key={j.id} href={`/foreman/jobs/${j.id}`}>
            <ForemanCard className="active:bg-orange-50">
              <p className="font-bold text-lg text-gray-900">{j.lead?.clientName ?? j.siteAddress}</p>
              <p className="text-sm text-gray-500 mb-2">{j.siteAddress}</p>
              <span className="inline-block text-xs font-semibold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                {STATUS_LABEL[j.status] ?? j.status}
              </span>
            </ForemanCard>
          </Link>
        ))}
      </div>
    </ForemanScreen>
  );
}
