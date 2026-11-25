import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, Users, ArrowRight, Clapperboard } from "lucide-react";
import api from "../../api/axios.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const formatScheduledAt = (value) => {
  if (!value) return "Schedule to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule to be announced";

  return {
    date: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
};

function UpcomingWatchSpaces() {
  const [watchSpaces, setWatchSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const fetchUpcomingWatchSpaces = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/watch-spaces/upcoming?limit=10");
        if (active) setWatchSpaces(response.data.watchSpaces || []);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message || "Failed to load upcoming Watch Spaces",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchUpcomingWatchSpaces();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mt-10 w-full text-white">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[2px] text-red-500">
            <CalendarDays size={14} />
            Upcoming Watch Spaces
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Upcoming Watch Spaces
          </h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Scheduled group watch sessions you can join.
          </p>
        </div>
        {!loading && !error && watchSpaces.length > 0 && (
          <button
            type="button"
            onClick={() => navigate("/watch-spaces")}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-red-500/50 hover:bg-red-500/10"
          >
            View All <ArrowRight size={14} />
          </button>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[290px] animate-pulse overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
            >
              <div className="h-36 bg-white/[0.06]" />
              <div className="space-y-3 p-3">
                <div className="h-3 w-2/3 rounded bg-white/[0.08]" />
                <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                <div className="h-8 rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && watchSpaces.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <CalendarDays size={28} className="mx-auto mb-3 text-zinc-500" />
          <h3 className="font-semibold text-white">No upcoming Watch Spaces</h3>
          <p className="mt-2 text-sm text-zinc-500">
            No upcoming scheduled Watch Spaces.
          </p>
        </div>
      )}

      {!loading && !error && watchSpaces.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {watchSpaces.map((room) => {
            const title = room.title || {};
            const thumbnailUrl =
              title._id && title.thumbnailKey
                ? `${API_BASE_URL}/titles/${title._id}/thumbnail`
                : null;
            const scheduled = formatScheduledAt(room.scheduledAt);
            const participantCount = room.participants?.length || 0;

            return (
              <article
                key={room._id}
                className="group min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#17171b] shadow-lg transition duration-300 hover:-translate-y-1 hover:border-red-500/45 hover:shadow-[0_14px_35px_rgba(229,9,20,0.12)]"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/watch-spaces/${room._id}`)}
                  className="relative block aspect-video w-full overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-left"
                  aria-label={`Open ${title.name || "Watch Space"}`}
                >
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={title.name || "Movie thumbnail"}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${thumbnailUrl ? "hidden" : ""}`}>
                    <Clapperboard size={34} className="text-zinc-600" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-white">
                    <CalendarDays size={13} className="text-red-400" />
                    {typeof scheduled === "string" ? scheduled : `${scheduled.date} · ${scheduled.time}`}
                  </div>
                </button>

                <div className="p-3">
                  <h3 className="truncate text-sm font-bold text-white" title={title.name}>
                    {title.name || "Untitled Watch Space"}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
                    <span className="text-amber-400">♟</span>
                    Hosted by {room.host?.name || "Unknown"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-red-400" />
                      {participantCount} joined
                    </span>
                    {room.maxParticipants ? (
                      <span>{participantCount}/{room.maxParticipants}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/watch-spaces/${room._id}`)}
                    className="mt-3 w-full rounded-full bg-[#e50914] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-red-500 active:scale-[0.98]"
                  >
                    Join WatchSpace
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default UpcomingWatchSpaces;
