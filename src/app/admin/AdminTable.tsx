"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, Users, Activity, UserCheck, Mail, Globe, Code2,
  CalendarDays, Clock, ArrowLeft, Shield, CreditCard,
  ChevronUp, ChevronDown, ChevronsUpDown, BarChart2, X,
  Layers,
} from "lucide-react";

export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  subscriptions: number;
};

type StatusFilter = "all" | "active" | "recent" | "inactive";
type ProviderFilter = "all" | "email" | "google" | "github";
type SubsFilter = "all" | "has" | "none" | "heavy";
type JoinedFilter = "all" | "7d" | "30d" | "90d";
type SortKey = "joined" | "seen" | "subs" | "email";
type SortDir = "asc" | "desc";
type ChartPeriod = "30d" | "90d" | "all";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function isActiveInDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < days * 86400000;
}

function avatarColor(email: string): string {
  const colors = ["bg-blue-500","bg-purple-500","bg-green-500","bg-pink-500","bg-orange-500","bg-teal-500"];
  let hash = 0;
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(hash) % colors.length];
}

function getChartData(users: AdminUser[], period: ChartPeriod) {
  const now = new Date(); now.setHours(0,0,0,0);

  if (period === "30d") {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (29 - i));
      const ds = d.toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: users.filter(u => u.created_at.slice(0, 10) === ds).length,
        isToday: i === 29,
      };
    });
  }

  if (period === "90d") {
    return Array.from({ length: 13 }, (_, i) => {
      const start = new Date(now); start.setDate(start.getDate() - (90 - i * 7));
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = users.filter(u => { const d = new Date(u.created_at); return d >= start && d <= end; }).length;
      return { label, count, isToday: i === 12 };
    });
  }

  if (users.length === 0) return [];
  const oldest = new Date(Math.min(...users.map(u => new Date(u.created_at).getTime())));
  oldest.setDate(1); oldest.setHours(0,0,0,0);
  const months: { label: string; count: number; isToday: boolean }[] = [];
  const cursor = new Date(oldest);
  while (cursor <= now) {
    const y = cursor.getFullYear(), mo = cursor.getMonth();
    months.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      count: users.filter(u => { const d = new Date(u.created_at); return d.getFullYear() === y && d.getMonth() === mo; }).length,
      isToday: y === now.getFullYear() && mo === now.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  const p = provider.toLowerCase();
  if (p === "google") return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100"><Globe className="w-3 h-3" />Google</span>;
  if (p === "github") return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200"><Code2 className="w-3 h-3" />GitHub</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100"><Mail className="w-3 h-3" />Email</span>;
}

function StatusBadge({ lastSignIn }: { lastSignIn: string | null }) {
  if (isActiveInDays(lastSignIn, 7)) return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"/>Active</span>;
  if (isActiveInDays(lastSignIn, 30)) return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"/>Recent</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full"/>Inactive</span>;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-300 inline ml-1" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
}

function SignupChart({ users, period, onPeriod }: { users: AdminUser[]; period: ChartPeriod; onPeriod: (p: ChartPeriod) => void }) {
  const data = useMemo(() => getChartData(users, period), [users, period]);
  const max = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  const showEvery = data.length > 20 ? Math.ceil(data.length / 8) : data.length > 10 ? 2 : 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-gray-900 text-sm">User Signups</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{total} new user{total !== 1 ? "s" : ""} in this period</p>
        </div>
        <div className="flex gap-1">
          {(["30d","90d","all"] as ChartPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => onPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${period === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              {p === "all" ? "All time" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-0.5 h-20 w-full">
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.label}: ${d.count} user${d.count !== 1 ? "s" : ""}`}
            className="flex-1 flex flex-col justify-end group relative"
          >
            <div
              className={`rounded-sm transition-all ${d.count === 0 ? "bg-gray-100" : d.isToday ? "bg-blue-500" : "bg-blue-200 group-hover:bg-blue-400"}`}
              style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%` }}
            />
            {/* Tooltip */}
            {d.count > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap">
                  {d.label}: {d.count}
                </div>
                <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex items-start gap-0.5 mt-1 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex justify-center">
            {i % showEvery === 0 && (
              <span className="text-[9px] text-gray-400 truncate">{d.label.split(" ")[0]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminTable({ users, currentUserEmail }: { users: AdminUser[]; currentUserEmail: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [subsFilter, setSubsFilter] = useState<SubsFilter>("all");
  const [joinedFilter, setJoinedFilter] = useState<JoinedFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupByDate, setGroupByDate] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("30d");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    let list = [...users];
    const q = search.toLowerCase();
    if (q) list = list.filter(u => u.email.toLowerCase().includes(q));

    if (statusFilter === "active")   list = list.filter(u => isActiveInDays(u.last_sign_in_at, 7));
    if (statusFilter === "recent")   list = list.filter(u => !isActiveInDays(u.last_sign_in_at, 7) && isActiveInDays(u.last_sign_in_at, 30));
    if (statusFilter === "inactive") list = list.filter(u => !isActiveInDays(u.last_sign_in_at, 30));

    if (providerFilter !== "all") list = list.filter(u => u.provider.toLowerCase() === providerFilter);

    if (subsFilter === "has")   list = list.filter(u => u.subscriptions > 0);
    if (subsFilter === "none")  list = list.filter(u => u.subscriptions === 0);
    if (subsFilter === "heavy") list = list.filter(u => u.subscriptions >= 5);

    if (joinedFilter !== "all") {
      const days = joinedFilter === "7d" ? 7 : joinedFilter === "30d" ? 30 : 90;
      list = list.filter(u => isActiveInDays(u.created_at, days));
    }

    list.sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === "joined") { va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
      else if (sortKey === "seen") { va = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0; vb = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0; }
      else if (sortKey === "subs") { va = a.subscriptions; vb = b.subscriptions; }
      else { va = a.email.charCodeAt(0); vb = b.email.charCodeAt(0); }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return list;
  }, [users, search, statusFilter, providerFilter, subsFilter, joinedFilter, sortKey, sortDir]);

  // Group filtered users by join date for grouped view
  const groupedByDate = useMemo(() => {
    if (!groupByDate) return null;
    const groups: { dateLabel: string; users: AdminUser[] }[] = [];
    const seen = new Map<string, number>();
    for (const u of filtered) {
      const key = new Date(u.created_at).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      if (!seen.has(key)) { seen.set(key, groups.length); groups.push({ dateLabel: key, users: [] }); }
      groups[seen.get(key)!].users.push(u);
    }
    return groups;
  }, [filtered, groupByDate]);

  const activeFilters = [statusFilter !== "all", providerFilter !== "all", subsFilter !== "all", joinedFilter !== "all"].filter(Boolean).length;

  function clearFilters() {
    setStatusFilter("all"); setProviderFilter("all"); setSubsFilter("all"); setJoinedFilter("all"); setSearch("");
  }

  const active7d = users.filter(u => isActiveInDays(u.last_sign_in_at, 7)).length;
  const newThisMonth = users.filter(u => isActiveInDays(u.created_at, 30)).length;
  const totalSubs = users.reduce((s, u) => s + u.subscriptions, 0);

  const selectCls = "text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer";

  function UserRow({ user }: { user: AdminUser }) {
    return (
      <tr className="hover:bg-gray-50/50 transition-colors">
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${avatarColor(user.email)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {user.email[0].toUpperCase()}
            </div>
            <span className="text-gray-800 font-medium truncate max-w-[200px]">{user.email}</span>
          </div>
        </td>
        <td className="px-4 py-3.5"><ProviderBadge provider={user.provider} /></td>
        <td className="px-4 py-3.5">
          <div>
            <p className="text-xs text-gray-700 font-medium">{formatDate(user.created_at)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(user.created_at)}</p>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <span className="text-xs text-gray-600">{timeAgo(user.last_sign_in_at)}</span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-800">{user.subscriptions}</span>
          </div>
        </td>
        <td className="px-4 py-3.5"><StatusBadge lastSignIn={user.last_sign_in_at} /></td>
      </tr>
    );
  }

  function DateGroupHeader({ label, count }: { label: string; count: number }) {
    return (
      <tr>
        <td colSpan={6} className="px-5 py-2 bg-blue-50/60 border-y border-blue-100">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">{label}</span>
            <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">{count}</span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Renew<span className="text-blue-600">Tracker</span></span>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-1">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-gray-500">{currentUserEmail}</span>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to site
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor and track all registered users</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Users", value: users.length, icon: Users, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
            { label: "Active (7 days)", value: active7d, icon: Activity, color: "bg-green-50 text-green-600", border: "border-green-100" },
            { label: "New (30 days)", value: newThisMonth, icon: UserCheck, color: "bg-purple-50 text-purple-600", border: "border-purple-100" },
            { label: "Total Subscriptions", value: totalSubs, icon: CreditCard, color: "bg-orange-50 text-orange-600", border: "border-orange-100" },
          ].map(({ label, value, icon: Icon, color, border }) => (
            <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm p-5`}>
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Signup chart */}
        <SignupChart users={users} period={chartPeriod} onPeriod={setChartPeriod} />

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            {/* Row 1: title + search + group toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="font-semibold text-gray-900 text-sm">All Users</span>
                <span className="text-[11px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-48"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                    </button>
                  )}
                </div>

                {/* Group by date */}
                <button
                  onClick={() => setGroupByDate(v => !v)}
                  className={`hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${groupByDate ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Group by date
                </button>

                {/* Clear filters */}
                {(activeFilters > 0 || search) && (
                  <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-red-200 transition-colors">
                    <X className="w-3 h-3" /> Clear {activeFilters > 0 ? `(${activeFilters})` : ""}
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: filter dropdowns */}
            <div className="flex flex-wrap gap-2">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className={selectCls}>
                <option value="all">All status</option>
                <option value="active">Active (7d)</option>
                <option value="recent">Recent (30d)</option>
                <option value="inactive">Inactive</option>
              </select>

              <select value={providerFilter} onChange={e => setProviderFilter(e.target.value as ProviderFilter)} className={selectCls}>
                <option value="all">All providers</option>
                <option value="email">Email</option>
                <option value="google">Google</option>
                <option value="github">GitHub</option>
              </select>

              <select value={subsFilter} onChange={e => setSubsFilter(e.target.value as SubsFilter)} className={selectCls}>
                <option value="all">All subscriptions</option>
                <option value="has">Has subscriptions</option>
                <option value="none">No subscriptions</option>
                <option value="heavy">5+ subscriptions</option>
              </select>

              <select value={joinedFilter} onChange={e => setJoinedFilter(e.target.value as JoinedFilter)} className={selectCls}>
                <option value="all">Joined any time</option>
                <option value="7d">Joined last 7d</option>
                <option value="30d">Joined last 30d</option>
                <option value="90d">Joined last 90d</option>
              </select>

              <select
                value={`${sortKey}_${sortDir}`}
                onChange={e => { const [k, d] = e.target.value.split("_"); setSortKey(k as SortKey); setSortDir(d as SortDir); }}
                className={selectCls}
              >
                <option value="joined_desc">Newest joined</option>
                <option value="joined_asc">Oldest joined</option>
                <option value="seen_desc">Last seen (recent)</option>
                <option value="seen_asc">Last seen (oldest)</option>
                <option value="subs_desc">Most subscriptions</option>
                <option value="subs_asc">Fewest subscriptions</option>
                <option value="email_asc">Email A→Z</option>
              </select>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("email")}>
                    User <SortIcon col="email" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Provider</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("joined")}>
                    Joined <SortIcon col="joined" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("seen")}>
                    Last seen <SortIcon col="seen" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("subs")}>
                    Subscriptions <SortIcon col="subs" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-sm text-gray-400">
                      No users match your filters
                    </td>
                  </tr>
                ) : groupedByDate ? (
                  groupedByDate!.map(group => (
                    <>
                      <DateGroupHeader key={group.dateLabel + "-h"} label={group.dateLabel} count={group.users.length} />
                      {group.users.map(user => <UserRow key={user.id} user={user} />)}
                    </>
                  ))
                ) : (
                  filtered.map(user => <UserRow key={user.id} user={user} />)
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">No users match your filters</div>
            ) : (
              filtered.map(user => (
                <div key={user.id} className="p-4 flex gap-3">
                  <div className={`w-10 h-10 rounded-full ${avatarColor(user.email)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <ProviderBadge provider={user.provider} />
                      <StatusBadge lastSignIn={user.last_sign_in_at} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDateShort(user.created_at)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(user.last_sign_in_at)}</span>
                      <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{user.subscriptions} sub{user.subscriptions !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                Showing {filtered.length} of {users.length} users
                {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
