import { AnimatePresence, motion } from "motion/react";
import { Play, Users, Crown, Lock, Globe, Clock, Film } from "lucide-react";

export default function RoomHero({
  watchSpace,
  title,
  hostName,
  participantCount = 0,
  isEnded = false,
  isPlaying = false,
  onPlay,
}) {
  const titleName = title?.name || "Untitled Movie";

  const description = title?.description || "No description available.";

  const releaseYear = title?.releaseYear;

  const duration = title?.duration;

  const genre = Array.isArray(title?.genre)
    ? title.genre.join(" • ")
    : title?.genre;

  const thumbnailUrl = title?._id
    ? `/api/titles/${title._id}/thumbnail`
    : title?.id
      ? `/api/titles/${title.id}/thumbnail`
      : null;

  return (
    <AnimatePresence mode="wait">
      {!isPlaying && (
        <motion.section
          key="room-hero"
          initial={{ opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: -24,
            scale: 0.97,
            height: 0,
            marginBottom: 0,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="relative isolate min-h-[390px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-2xl shadow-black/30 sm:min-h-[460px] lg:min-h-[520px]"
        >
          {/* Background */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}

          {/* Cinematic overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />

          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30" />

          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-red-600/10 blur-[100px]" />

          {/* Content */}
          <div className="relative z-10 flex min-h-[390px] flex-col justify-end p-5 sm:min-h-[460px] sm:p-9 lg:min-h-[520px] lg:max-w-3xl lg:p-12">
            {/* Room status */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Watch Together
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                  isEnded
                    ? "bg-white/10 text-white/50"
                    : "bg-green-500/10 text-green-400"
                }`}
              >
                {isEnded ? "ROOM ENDED" : "ROOM LIVE"}
              </span>
            </div>

            {/* Movie title */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              {titleName}
            </motion.h1>

            {/* Metadata */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-white/70 sm:text-sm">
              {releaseYear && <span>{releaseYear}</span>}

              {duration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  {duration} min
                </span>
              )}

              {genre && (
                <span className="inline-flex items-center gap-1.5">
                  <Film size={14} />
                  {genre}
                </span>
              )}
            </div>

            {/* Description - preserved */}
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
              {description}
            </p>

            {/* Room information */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/70 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <Crown size={15} className="text-yellow-400" />
                {hostName || "Room Host"}
              </span>

              <span className="inline-flex items-center gap-2">
                <Users size={15} className="text-red-400" />
                {participantCount} watching
              </span>

              <span className="inline-flex items-center gap-2">
                {watchSpace?.isPrivate ? (
                  <Lock size={14} />
                ) : (
                  <Globe size={14} />
                )}
                {watchSpace?.isPrivate ? "Private Room" : "Public Room"}
              </span>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPlay}
                disabled={isEnded || !onPlay}
                className="inline-flex items-center gap-3 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:scale-[1.03] hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play size={19} fill="currentColor" />
                Play Movie
              </button>

              <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-3.5 text-xs font-semibold text-white/80 backdrop-blur-md">
                <Users size={15} />
                Watch with friends
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
