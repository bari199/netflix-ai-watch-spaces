import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Bot,
  Film,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext.jsx";
import { getAdminDashboardOverview } from "../../services/adminDashboard.service.js";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const numberFormat = new Intl.NumberFormat("en-IN");

const StatCard = ({ label, value, detail, icon: Icon, accent }) => (
  <Card className="border-white/10 bg-[#181818] p-5 text-white shadow-lg shadow-black/10">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">
          {numberFormat.format(value || 0)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{detail}</p>
      </div>
      <div className={`rounded-xl p-3 ${accent}`}>
        <Icon size={20} />
      </div>
    </div>
  </Card>
);

const DistributionRow = ({ label, value, total, color = "bg-red-500" }) => {
  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="capitalize text-zinc-300">{label.replaceAll("_", " ")}</span>
        <span className="tabular-nums text-zinc-400">{numberFormat.format(value || 0)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const activityDescription = (item) => {
  if (item.type === "user_registered") {
    return { title: item.user?.name || "A user", detail: "registered on the platform", icon: Users };
  }
  if (item.type === "watch_space_created") {
    return {
      title: item.watchSpace?.host?.name || "A host",
      detail: `created a Watch Space${item.watchSpace?.title?.name ? ` for ${item.watchSpace.title.name}` : ""}`,
      icon: Video,
    };
  }
  return {
    title: item.user?.name || "A participant",
    detail: "sent a chat message in a Watch Space",
    icon: MessageSquare,
  };
};

const formatActivityTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const MonthlyGrowthChart = ({ series }) => {
  const maxValue = Math.max(
    1,
    ...(series?.users || []).map((item) => item.count || 0),
    ...(series?.watchSpaces || []).map((item) => item.count || 0),
    ...(series?.messages || []).map((item) => item.count || 0),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-red-500" /> Users</span>
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-sky-500" /> Watch Spaces</span>
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Messages</span>
      </div>
      <div className="grid grid-cols-10 items-end gap-2 sm:gap-3">
        {(series?.users || []).map((month, index) => {
          const values = [
            { value: month.count || 0, color: "bg-red-500" },
            { value: series?.watchSpaces?.[index]?.count || 0, color: "bg-sky-500" },
            { value: series?.messages?.[index]?.count || 0, color: "bg-emerald-500" },
          ];
          return (
            <div key={month.monthKey || month.month || index} className="min-w-0">
              <div className="flex h-36 items-end justify-center gap-0.5 sm:gap-1">
                {values.map((item, valueIndex) => (
                  <div
                    key={valueIndex}
                    title={`${item.value} ${["users", "Watch Spaces", "messages"][valueIndex]}`}
                    className={`w-full max-w-3 rounded-t-sm ${item.color} opacity-90`}
                    style={{ height: `${Math.max(item.value > 0 ? 4 : 0, (item.value / maxValue) * 100)}%` }}
                  />
                ))}
              </div>
              <p className="mt-2 truncate text-center text-[10px] text-zinc-500">{month.month}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminDashboardOverview();
      setOverview(response.overview);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not load dashboard analytics. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const activityItems = useMemo(() => overview?.recentActivity || [], [overview]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1c1e] via-[#161617] to-[#241012] p-6 sm:p-8"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-600/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              <ShieldCheck size={14} /> Administration
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
              Welcome, {user?.name || "Admin"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
              Monitor platform activity, users, Watch Spaces and AI engagement.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadOverview} disabled={loading} className="h-11 gap-2 border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Link to="/admin/titles/create">
              <Button className="h-11 gap-2 bg-[#e50914] px-5 font-semibold text-white hover:bg-red-700">
                <Plus size={18} /> Create New Title
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} role="alert" className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">{error}</p>
          <Button size="sm" variant="outline" onClick={loadOverview} className="border-red-400/30 text-white hover:bg-red-500/20 hover:text-white">Try again</Button>
        </motion.div>
      )}

      <motion.section variants={itemVariants} className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Platform Overview</h2>
          <p className="text-sm text-zinc-500">Live totals from the platform database.</p>
        </div>
        {loading && !overview ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />)}
          </div>
        ) : overview ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Users" value={overview.users?.total} detail={`${overview.users?.admin || 0} admins · ${overview.users?.host || 0} hosts`} icon={Users} accent="bg-sky-500/15 text-sky-400" />
            <StatCard label="Watch Spaces" value={overview.watchSpaces?.total} detail={`${overview.watchSpaces?.active || 0} currently active`} icon={Video} accent="bg-violet-500/15 text-violet-400" />
            <StatCard label="Video Titles" value={overview.titles?.total} detail={`${overview.titles?.published || 0} published · ${overview.titles?.drafts || 0} drafts`} icon={Film} accent="bg-amber-500/15 text-amber-400" />
            <StatCard label="AI Questions" value={overview.ai?.totalQuestions} detail="Total questions asked" icon={Bot} accent="bg-emerald-500/15 text-emerald-400" />
          </div>
        ) : !error ? (
          <p className="rounded-xl border border-white/10 bg-[#181818] p-6 text-sm text-zinc-400">No overview data available yet.</p>
        ) : null}
      </motion.section>

      {overview && (
        <>
          <motion.section variants={itemVariants} className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card className="border-white/10 bg-[#181818] p-5 text-white sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Platform Growth</h2>
                  <p className="mt-1 text-sm text-zinc-500">Monthly activity · last 10 months</p>
                </div>
                <Activity className="text-red-500" size={20} />
              </div>
              <MonthlyGrowthChart series={overview.charts?.monthlyPlatformGrowth} />
            </Card>

            <Card className="border-white/10 bg-[#181818] p-5 text-white sm:p-6">
              <h2 className="text-lg font-semibold">Watch Space Status</h2>
              <p className="mt-1 text-sm text-zinc-500">Distribution by current status</p>
              <div className="mt-6 space-y-5">
                {(overview.charts?.watchSpaceStatusDistribution || []).map((item) => (
                  <DistributionRow key={item.status} label={item.status} value={item.count} total={overview.watchSpaces?.total} color={item.status === "active" ? "bg-emerald-500" : item.status === "scheduled" ? "bg-sky-500" : item.status === "waiting" ? "bg-amber-500" : "bg-zinc-500"} />
                ))}
              </div>
            </Card>
          </motion.section>

          <motion.section variants={itemVariants} className="grid gap-5 xl:grid-cols-2">
            <Card className="border-white/10 bg-[#181818] p-5 text-white sm:p-6">
              <h2 className="text-lg font-semibold">User Roles</h2>
              <p className="mt-1 text-sm text-zinc-500">Registered accounts by role</p>
              <div className="mt-6 space-y-5">
                {(overview.charts?.userRoleDistribution || []).map((item) => (
                  <DistributionRow key={item.role} label={item.role} value={item.count} total={overview.users?.total} color={item.role === "admin" ? "bg-red-500" : item.role === "host" ? "bg-violet-500" : "bg-sky-500"} />
                ))}
              </div>
            </Card>

            <Card className="border-white/10 bg-[#181818] p-5 text-white sm:p-6">
              <h2 className="text-lg font-semibold">Engagement</h2>
              <p className="mt-1 text-sm text-zinc-500">Community activity across Watch Spaces</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.04] p-4">
                  <MessageSquare className="mb-3 text-sky-400" size={19} />
                  <p className="text-2xl font-bold">{numberFormat.format(overview.engagement?.totalMessages || 0)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Chat messages</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-4">
                  <Users className="mb-3 text-violet-400" size={19} />
                  <p className="text-2xl font-bold">{numberFormat.format(overview.engagement?.uniqueParticipants || 0)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Unique participants</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-zinc-500">{overview.engagement?.totalParticipantRecords || 0} participant records across Watch Spaces.</p>
            </Card>
          </motion.section>

          <motion.section variants={itemVariants}>
            <Card className="border-white/10 bg-[#181818] p-5 text-white sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Recent Activity</h2>
                  <p className="mt-1 text-sm text-zinc-500">Latest platform events</p>
                </div>
                <Activity size={20} className="text-red-500" />
              </div>
              {activityItems.length ? (
                <div className="divide-y divide-white/[0.07]">
                  {activityItems.map((item) => {
                    const activity = activityDescription(item);
                    const Icon = activity.icon;
                    return (
                      <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300"><Icon size={17} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-zinc-200"><span className="font-semibold text-white">{activity.title}</span> {activity.detail}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatActivityTime(item.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-6 text-sm text-zinc-500">No recent activity to show.</p>
              )}
            </Card>
          </motion.section>
        </>
      )}

      <motion.div variants={itemVariants} className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#141414] p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600/10 text-red-500"><Film size={22} /></div>
          <div>
            <h3 className="font-semibold text-white">Content Management</h3>
            <p className="text-sm text-zinc-500">Manage the Netflix video library.</p>
          </div>
        </div>
        <Link to="/admin/titles">
          <Button variant="outline" className="gap-2 border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white">
            View All Titles <ArrowRight size={16} />
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
