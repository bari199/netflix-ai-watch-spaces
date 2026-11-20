import { useEffect, useState } from "react";
import {
  getMyEndedWatchSpaces,
  getWatchSpaceAnalytics,
} from "../../services/watchSpace.service.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  Clock3,
  Users,
  Bot,
  Sparkles,
  MessageCircle,
  CalendarDays,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const formatDuration = (seconds = 0) => {
  const totalSeconds = Number(seconds) || 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2">
      <Icon size={15} className="shrink-0 text-red-400" />

      <div className="min-w-0">
        <p className="text-[10px] text-zinc-500">{label}</p>
        <p className="truncate text-xs font-semibold text-zinc-200">{value}</p>
      </div>
    </div>
  );
}

function PastWatchSpaces() {
  const { user } = useAuth();

  const currentUserId = (user?._id || user?.id || "").toString();

  const [watchSpaces, setWatchSpaces] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPastWatchSpaces = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getMyEndedWatchSpaces();
        const spaces = response?.watchSpaces || [];

        if (!isMounted) return;

        setWatchSpaces(spaces);

        const hostSpaces = spaces.filter((space) => {
          const hostId = (
            space?.host?._id ||
            space?.host?.id ||
            space?.host ||
            ""
          ).toString();

          return currentUserId && hostId === currentUserId;
        });

        const analyticsResults = await Promise.all(
          hostSpaces.map(async (space) => {
            const spaceId = space?._id;

            if (!spaceId) return [null, null];

            try {
              const result = await getWatchSpaceAnalytics(spaceId);

              return [spaceId, result?.analytics || result || null];
            } catch {
              return [spaceId, null];
            }
          }),
        );

        if (!isMounted) return;

        setAnalytics(Object.fromEntries(analyticsResults.filter(([id]) => id)));
      } catch (err) {
        if (isMounted) {
          setError(
            err?.response?.data?.message || "Unable to load past Watch Spaces.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPastWatchSpaces();

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Past Watch Spaces</h2>

        <p className="text-sm text-zinc-400">Loading your watch history...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Past Watch Spaces</h2>

        <p className="text-sm text-red-400">{error}</p>
      </section>
    );
  }

  if (watchSpaces.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">Past Watch Spaces</h2>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
          <CalendarDays size={30} className="mx-auto mb-3 text-zinc-500" />

          <p className="text-sm text-zinc-300">
            No completed Watch Spaces yet.
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Your past sessions will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Past Watch Spaces</h2>

          <p className="mt-1 text-xs text-zinc-500">
            Your completed watch sessions
          </p>
        </div>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
          {watchSpaces.length} Sessions
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        {watchSpaces.map((space) => {
          const spaceId = space?._id;
          const stats = analytics[spaceId];
          const title = space?.title?.name || "Untitled";

          return (
            <article
              key={spaceId}
              className="group flex min-w-0 gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#18181b] p-3 transition hover:border-red-500/40 hover:bg-[#202023]"
            >
              {/* Thumbnail */}
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-800 sm:h-32 sm:w-28">
                {space?.title?._id && space?.title?.thumbnailKey ? (
                  <img
                    src={`${API_BASE_URL}/titles/${space.title._id}/thumbnail`}
                    alt={title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">
                    No thumbnail
                  </div>
                )}

                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300">
                  Completed
                </span>
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {title}
                  </h3>

                  <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                    <CalendarDays size={12} />
                    {formatDate(space?.endedAt)}
                  </p>
                </div>

                {stats ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <StatItem
                      icon={Clock3}
                      label="Duration"
                      value={formatDuration(stats.sessionDurationSeconds)}
                    />

                    <StatItem
                      icon={Users}
                      label="Peak Users"
                      value={stats.peakParticipants ?? 0}
                    />

                    <StatItem
                      icon={Bot}
                      label="AI Questions"
                      value={stats.aiQuestionsAsked ?? 0}
                    />

                    <StatItem
                      icon={Sparkles}
                      label="Trivia"
                      value={stats.triviaEventsSurfaced ?? 0}
                    />

                    <div className="col-span-2">
                      <StatItem
                        icon={MessageCircle}
                        label="Chat Activity"
                        value={`${stats.chatActivity ?? 0} messages`}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    Session analytics unavailable.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default PastWatchSpaces;
