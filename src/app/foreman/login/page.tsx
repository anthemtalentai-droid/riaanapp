"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/foreman/ui";

type ForemanOption = { id: string; name: string };

export default function ForemanLoginPage() {
  const router = useRouter();
  const [foremen, setForemen] = useState<ForemanOption[] | null>(null);
  const [selected, setSelected] = useState<ForemanOption | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/foreman-login-roster").then((r) => r.json()).then(setForemen).catch(() => setForemen([]));
  }, []);

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    const result = await signIn("foreman-pin", { userId: selected.id, pin, redirect: false });
    if (result?.error) {
      setError("Wrong PIN — try again.");
      setPin("");
      setSubmitting(false);
    } else {
      router.push("/foreman");
      router.refresh();
    }
  }

  useEffect(() => {
    if (pin.length !== 4 || !selected) return;
    // Defer out of the effect body itself — submit() sets state synchronously
    // on its first line, which react-hooks/set-state-in-effect flags if called
    // directly from here.
    const id = setTimeout(submit, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function press(d: string) {
    if (submitting) return;
    setError("");
    setPin((p) => (p.length < 4 ? p + d : p));
  }
  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-600 text-white text-2xl font-bold mb-3">CW</div>
          <h1 className="text-2xl font-bold text-gray-900">CW Painters</h1>
          <p className="text-sm text-gray-500 mt-1">Site App</p>
        </div>

        {foremen === null && (
          <div className="py-10"><Spinner /></div>
        )}

        {foremen !== null && foremen.length === 0 && (
          <div className="text-center bg-white rounded-2xl border border-orange-100 p-6">
            <p className="font-semibold text-gray-800 mb-1">No PIN access set up yet</p>
            <p className="text-sm text-gray-500">Ask the office to enable PIN login for you.</p>
          </div>
        )}

        {foremen !== null && foremen.length > 0 && !selected && (
          <div className="grid grid-cols-2 gap-3">
            {foremen.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className="bg-white border-2 border-orange-200 active:bg-orange-100 rounded-2xl p-5 text-center min-h-[96px] flex flex-col items-center justify-center gap-2"
              >
                <span className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-lg">
                  {f.name.charAt(0)}
                </span>
                <span className="font-semibold text-gray-800 text-sm leading-tight">{f.name}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="text-center">
            <button onClick={() => { setSelected(null); setPin(""); setError(""); }} className="text-sm text-orange-700 font-semibold mb-4">
              ← Not {selected.name}?
            </button>
            <p className="font-semibold text-gray-800 mb-1">{selected.name}</p>
            <p className="text-sm text-gray-500 mb-5">Enter your 4-digit PIN</p>

            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 border-orange-600 ${i < pin.length ? "bg-orange-600" : "bg-transparent"}`}
                />
              ))}
            </div>

            {error && <p className="text-red-600 font-medium mb-4">{error}</p>}
            {submitting && <div className="mb-4"><Spinner /></div>}

            <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => press(d)}
                  disabled={submitting}
                  className="h-16 rounded-2xl bg-white border-2 border-orange-200 active:bg-orange-100 text-2xl font-bold text-gray-800"
                >
                  {d}
                </button>
              ))}
              <div />
              <button
                onClick={() => press("0")}
                disabled={submitting}
                className="h-16 rounded-2xl bg-white border-2 border-orange-200 active:bg-orange-100 text-2xl font-bold text-gray-800"
              >
                0
              </button>
              <button
                onClick={backspace}
                disabled={submitting}
                className="h-16 rounded-2xl bg-white border-2 border-orange-200 active:bg-orange-100 text-xl font-bold text-gray-500"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        <p className="text-center mt-10">
          <Link href="/login" className="text-xs text-gray-400 underline">Office / Admin login</Link>
        </p>
      </div>
    </div>
  );
}
