"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "SALESMAN", "FOREMAN"] },
  { href: "/leads", label: "Leads", roles: ["ADMIN", "SALESMAN"] },
  { href: "/jobs", label: "Jobs", roles: ["ADMIN", "SALESMAN", "FOREMAN"] },
  { href: "/weekly-report", label: "Weekly Report", roles: ["ADMIN", "SALESMAN"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = (session?.user as any) ?? {};

  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(user.role));

  const roleBadgeColor: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    SALESMAN: "bg-blue-100 text-blue-700",
    FOREMAN: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col w-60 bg-white border-r border-gray-200 transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            CW
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">CW Painters</p>
            <p className="text-xs text-gray-400 leading-tight truncate">Ritriwill Holdings</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleNav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
              {user.name?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate leading-tight">{user.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBadgeColor[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-sm">CW Painters</span>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
