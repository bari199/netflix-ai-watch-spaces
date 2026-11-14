import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  getActiveWatchSpaces,
  joinWatchSpace,
} from "../../services/watchSpace.service.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const WatchSpacesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [watchSpaces, setWatchSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);

  const canCreateRoom = ["host", "admin"].includes(user?.role);

  const fetchWatchSpaces = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getActiveWatchSpaces();
      setWatchSpaces(response.watchSpaces || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load WatchSpaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchSpaces();
  }, [fetchWatchSpaces]);

  const handleJoin = async (watchSpace) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setJoiningId(watchSpace._id);
      setError("");

      await joinWatchSpace(watchSpace._id);

      navigate(`/watch-spaces/${watchSpace._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join WatchSpace.");
    } finally {
      setJoiningId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-400";

      case "waiting":
        return "bg-yellow-500/10 text-yellow-400";

      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <Link to="/" className="text-2xl font-bold text-red-600">
            NETFLIX <span className="text-white">WATCH SPACES</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-gray-400 sm:block">
                  {user.name}
                </span>

                <button
                  onClick={() => navigate("/")}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
                >
                  Home
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition hover:bg-red-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-10">
        {/* Page Heading */}
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-500">
              Watch Together
            </p>

            <h1 className="text-3xl font-bold sm:text-4xl">
              Discover WatchSpaces
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Join a room and enjoy movies together with friends.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={fetchWatchSpaces}
              disabled={loading}
              className="rounded-lg border border-white/15 px-4 py-3 text-sm transition hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            {canCreateRoom && (
              <button
                type="button"
                onClick={() => navigate("/watch-spaces/create")}
                className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-700"
              >
                + Create Room
              </button>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Room Count */}
        {!loading && !error && (
          <div className="text-sm text-gray-400">
            {watchSpaces.length} public WatchSpace
            {watchSpaces.length !== 1 ? "s" : ""} available
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-[#181818] p-12 text-center text-gray-400">
            Loading WatchSpaces...
          </div>
        ) : watchSpaces.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-white/10 bg-[#181818] px-5 py-16 text-center">
            <div className="mb-4 text-5xl">🎬</div>

            <h2 className="text-xl font-semibold">No WatchSpaces Available</h2>

            <p className="mt-2 text-sm text-gray-400">
              There are currently no public rooms. Check again later.
            </p>
          </div>
        ) : (
          /* WatchSpace Cards */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {watchSpaces.map((room) => {
              const title = room.title;
              const participantCount = room.participants?.length || 0;
              const isFull = participantCount >= room.maxParticipants;

              const isParticipant = room.participants?.some(
                (participant) =>
                  String(participant.user?._id || participant.user) ===
                  String(user?._id),
              );

              const thumbnailUrl = title?.thumbnailKey
                ? `${API_BASE_URL}/titles/${title._id}/thumbnail`
                : null;

              return (
                <article
                  key={room._id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-[#181818] transition hover:-translate-y-1 hover:border-red-500/40"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-[#252525]">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={title?.name || "Movie thumbnail"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-500">
                        No Thumbnail
                      </div>
                    )}

                    <span
                      className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(room.status)}`}
                    >
                      {room.status}
                    </span>

                    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                      {room.isPrivate ? "Private" : "Public"}
                    </span>
                  </div>

                  {/* Room Information */}
                  <div className="space-y-4 p-5">
                    <div>
                      <h2 className="truncate text-lg font-semibold text-white">
                        {title?.name || "Untitled Movie"}
                      </h2>

                      <p className="mt-1 text-sm text-gray-400">
                        Hosted by {room.host?.name || "Unknown"}
                      </p>
                    </div>

                    {/* Participants */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Participants</span>

                      <span className="font-medium text-white">
                        {participantCount} / {room.maxParticipants}
                      </span>
                    </div>

                    {/* Capacity Bar */}
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-red-600 transition-all"
                        style={{
                          width: `${Math.min(
                            (participantCount / room.maxParticipants) * 100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>

                    {/* Join Button */}
                    <button
                      type="button"
                      onClick={() => handleJoin(room)}
                      disabled={
                        joiningId === room._id ||
                        room.status === "ended" ||
                        (isFull && !isParticipant) ||
                        room.isLocked
                      }
                      className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      {joiningId === room._id
                        ? "Joining..."
                        : isParticipant
                          ? "Rejoin Room"
                          : room.isLocked
                            ? "Room Locked"
                            : isFull
                              ? "Room Full"
                              : "Join Room"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default WatchSpacesPage;
