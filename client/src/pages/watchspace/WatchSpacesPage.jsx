import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  RefreshCw,
  Plus,
  Users,
  Play,
  Sparkles,
  Clapperboard,
  ArrowLeft,
} from "lucide-react";

import Navbar from "../../components/layout/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  getActiveWatchSpaces,
  joinWatchSpace,
} from "../../services/watchSpace.service.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const WatchSpacesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [watchSpaces, setWatchSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);

  const searchQuery = searchParams.get("search")?.trim() || "";
  const normalizedQuery = searchQuery.toLowerCase();

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

  const filteredWatchSpaces = useMemo(() => {
    if (!normalizedQuery) return watchSpaces;

    return watchSpaces.filter((room) => {
      const searchableText = [
        room.title?.name,
        room.title?.description,
        room.host?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [watchSpaces, normalizedQuery]);

  const featuredRoom = filteredWatchSpaces[0];

  const getThumbnail = (room) => {
    if (!room?.title?._id || !room.title.thumbnailKey) return null;

    return `${API_BASE_URL}/titles/${room.title._id}/thumbnail`;
  };

  const handleJoin = async (room) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setJoiningId(room._id);
      setError("");

      await joinWatchSpace(room._id);
      navigate(`/watch-spaces/${room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join WatchSpace.");
    } finally {
      setJoiningId(null);
    }
  };

  const getRoomAction = (room) => {
    const participantCount = room.participants?.length || 0;
    const isFull = participantCount >= (room.maxParticipants || 1);

    const isParticipant = room.participants?.some(
      (participant) =>
        String(participant.user?._id || participant.user) === String(user?._id),
    );

    const disabled =
      joiningId === room._id ||
      room.status === "ended" ||
      (isFull && !isParticipant) ||
      room.isLocked;

    let label = "Join Room";

    if (joiningId === room._id) label = "Joining...";
    else if (isParticipant) label = "Rejoin Room";
    else if (room.isLocked) label = "Room Locked";
    else if (isFull) label = "Room Full";

    return { disabled, label };
  };

  const renderRoomCard = (room) => {
    const thumbnail = getThumbnail(room);
    const participantCount = room.participants?.length || 0;
    const action = getRoomAction(room);

    return (
      <motion.article
        key={room._id}
        variants={cardVariants}
        whileHover={{ y: -7, scale: 1.025 }}
        className="group min-w-0"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-[#181818] shadow-lg transition duration-300 group-hover:border-red-500/50 group-hover:shadow-[0_12px_35px_rgba(229,9,20,0.16)]">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={room.title?.name || "Movie poster"}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
              <Clapperboard size={34} className="text-zinc-600" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20 opacity-90" />

          <div className="absolute left-2 top-2">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize backdrop-blur-md ${
                room.status === "active"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-yellow-500/20 text-yellow-300"
              }`}
            >
              {room.status || "Waiting"}
            </span>
          </div>

          <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-md">
            {room.isPrivate ? "Private" : "Public"}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">
              {room.title?.name || "Untitled Movie"}
            </h3>

            <p className="mt-1 truncate text-[11px] text-zinc-300">
              Hosted by {room.host?.name || "Unknown"}
            </p>

            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-300">
              <Users size={12} />
              {participantCount}/{room.maxParticipants || 1}
            </div>

            <button
              type="button"
              onClick={() => handleJoin(room)}
              disabled={action.disabled}
              className="mt-3 w-full translate-y-2 rounded-md bg-red-600 py-2 text-xs font-bold text-white opacity-0 transition duration-300 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-700 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
            >
              {action.label}
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <span className="truncate text-xs text-zinc-400">
            {room.host?.name || "Unknown host"}
          </span>
          <span className="shrink-0 text-[10px] text-zinc-500">
            {participantCount} watching
          </span>
        </div>
      </motion.article>
    );
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#09090b] text-white">
      {/* Main Navbar */}
      <Navbar />

      {/* Back Navigation */}
      {/* <div className="mx-auto max-w-[1440px] px-5 pt-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-300 hover:border-red-500/40 hover:bg-red-600/10 hover:text-white"
        >
          <ArrowLeft
            size={17}
            className="transition-transform duration-300 group-hover:-translate-x-1"
          />
          Back
        </button>
      </div> */}

      {/* Cinematic Featured Banner */}
      {!loading && featuredRoom && !searchQuery && (
        <section className="relative">
          <div className="relative h-[420px] overflow-hidden sm:h-[500px] lg:h-[570px]">
            {getThumbnail(featuredRoom) ? (
              <motion.img
                initial={{ scale: 1.12 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                src={getThumbnail(featuredRoom)}
                alt={featuredRoom.title?.name || "Featured movie"}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-zinc-900 to-black" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-black/10" />

            <div className="relative mx-auto flex h-full max-w-[1440px] items-end px-5 pb-14 sm:px-8 sm:pb-20 lg:px-12">
              <motion.div
                initial={{ opacity: 0, x: -35 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="max-w-2xl"
              >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 backdrop-blur-md">
                  <Sparkles size={14} />
                  Featured Watch Space
                </div>

                <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-7xl">
                  {featuredRoom.title?.name || "Watch Together"}
                </h1>

                <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
                  {featuredRoom.title?.description ||
                    "Join this Watch Space and enjoy an unforgettable movie experience with friends."}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {featuredRoom.participants?.length || 0} watching
                  </span>
                  <span>•</span>
                  <span>Hosted by {featuredRoom.host?.name || "Unknown"}</span>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleJoin(featuredRoom)}
                    disabled={getRoomAction(featuredRoom).disabled}
                    className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    <Play size={17} fill="currentColor" />
                    {getRoomAction(featuredRoom).label}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/watch-spaces/${featuredRoom._id}`)
                    }
                    className="rounded-md bg-zinc-700/80 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-zinc-600"
                  >
                    More Info
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 pb-20 pt-8 sm:px-8 lg:px-12">
        {/* Page Toolbar */}
        <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">
              Your Movie Community
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              {searchQuery ? "Search Results" : "Explore Watch Spaces"}
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Find your people. Pick a movie. Watch together.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchWatchSpaces}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            {user && (
              <button
                type="button"
                onClick={() => navigate("/watch-spaces/create")}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
              >
                <Plus size={15} />
                Create Space
              </button>
            )}
          </div>
        </section>

        {/* Search Query */}
        {searchQuery && (
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Search size={16} className="text-red-500" />
              Results for <strong className="text-white">{searchQuery}</strong>
            </div>

            <button
              type="button"
              onClick={() => navigate("/watch-spaces")}
              className="text-xs font-semibold text-red-400 transition hover:text-red-300"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Room Count */}
        {!loading && !error && (
          <p className="mb-5 text-xs text-zinc-500">
            {filteredWatchSpaces.length} Watch Space
            {filteredWatchSpaces.length !== 1 ? "s" : ""} available
          </p>
        )}

        {/* Cards */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[2/3] animate-pulse rounded-xl bg-zinc-800/70"
                />
              ))}
            </motion.div>
          ) : filteredWatchSpaces.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-16 text-center"
            >
              <Clapperboard size={42} className="mx-auto mb-4 text-zinc-600" />

              <h3 className="text-xl font-bold">
                {searchQuery
                  ? "No Matching Watch Spaces"
                  : "No Watch Spaces Available"}
              </h3>

              <p className="mt-2 text-sm text-zinc-400">
                {searchQuery
                  ? "Try searching with another movie or host name."
                  : "There are currently no public rooms. Come back later."}
              </p>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => navigate("/watch-spaces")}
                  className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold hover:bg-red-700"
                >
                  Explore All Rooms
                </button>
              )}
            </motion.div>
          ) : (
            <motion.section
              key={searchQuery || "all-rooms"}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              {filteredWatchSpaces.map((room) => renderRoomCard(room))}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default WatchSpacesPage;
