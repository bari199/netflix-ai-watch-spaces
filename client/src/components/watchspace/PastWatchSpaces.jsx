import { useEffect, useState } from "react";
import {
  getMyEndedWatchSpaces,
  getWatchSpaceAnalytics,
} from "../../services/watchSpace.service.js";
import { useAuth } from "../../context/AuthContext.jsx";

const formatDuration = (seconds = 0) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

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
            space.host?._id ||
            space.host?.id ||
            space.host ||
            ""
          ).toString();

          return currentUserId && hostId === currentUserId;
        });

        const analyticsResults = await Promise.all(
          hostSpaces.map(async (space) => {
            try {
              const result = await getWatchSpaceAnalytics(space._id);

              return [space._id, result?.analytics || result];
            } catch {
              return [space._id, null];
            }
          }),
        );

        if (!isMounted) return;

        setAnalytics(Object.fromEntries(analyticsResults));
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || "Unable to load past Watch Spaces.",
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
        <h2 className="text-2xl font-bold text-white">Past Watch Spaces</h2>
        <p className="text-sm text-zinc-400">Loading your watch history...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Past Watch Spaces</h2>
        <p className="text-sm text-red-400">{error}</p>
      </section>
    );
  }

  if (watchSpaces.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Past Watch Spaces</h2>
        <p className="text-sm text-zinc-400">
          Your completed Watch Spaces will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Past Watch Spaces</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Review your completed watch sessions.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {watchSpaces.map((space) => {
          const stats = analytics[space._id];
          const title = space.title?.name || "Untitled";

          return (
            <article
              key={space._id}
              className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
            >
              {space.title?.thumbnailKey && (
                <img
                  src={space.title.thumbnailKey}
                  alt={title}
                  className="h-40 w-full object-cover"
                />
              )}

              <div className="space-y-4 p-5">
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Ended {formatDate(space.endedAt)}
                  </p>
                </div>

                {stats ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="text-xs text-zinc-400">Duration</p>
                      <p className="mt-1 font-semibold text-white">
                        {formatDuration(stats.sessionDurationSeconds)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="text-xs text-zinc-400">Peak Participants</p>
                      <p className="mt-1 font-semibold text-white">
                        {stats.peakParticipants ?? 0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="text-xs text-zinc-400">AI Questions</p>
                      <p className="mt-1 font-semibold text-white">
                        {stats.aiQuestionsAsked ?? 0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="text-xs text-zinc-400">Trivia Events</p>
                      <p className="mt-1 font-semibold text-white">
                        {stats.triviaEventsSurfaced ?? 0}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-lg bg-black/30 p-3">
                      <p className="text-xs text-zinc-400">Chat Activity</p>
                      <p className="mt-1 font-semibold text-white">
                        {stats.chatActivity ?? 0} messages
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">
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
