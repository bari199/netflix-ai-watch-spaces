import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Crown,
  Circle,
  RefreshCw,
  Volume2,
  VolumeX,
  UserRoundX,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";

const ParticipantsPanel = ({
  participants = [],
  onlineParticipants = [],
  hostId,
  isHost = false,
  isEnded = false,
  loading = false,
  actionLoading = false,
  getUserId,
  onRefresh,
  onMute,
  onTransferHost,
  onRemove,
}) => {
  const getParticipantName = (user) =>
    user?.name || user?.fullName || "Unknown User";

  const getAvatar = (user) => user?.avatar || user?.avatarUrl;

  const isParticipantOnline = (participantId) =>
    onlineParticipants.some(
      (onlineParticipant) =>
        getUserId(onlineParticipant?.user || onlineParticipant) ===
        participantId,
    );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex h-full min-h-0 max-h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#101010] text-white shadow-lg shadow-black/20"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-red-950/25 to-transparent px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users size={17} className="shrink-0 text-red-400" />

            <h2 className="text-sm font-bold tracking-tight text-white">
              People in this room
            </h2>

            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
              {participants.length}
            </span>
          </div>

          <p className="mt-1 text-[10px] text-white/40">
            {participants.length} total · {onlineParticipants.length} online
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-green-400">
            <Circle size={7} fill="currentColor" />
            Online
          </span>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || actionLoading}
            aria-label="Refresh participants"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/55 transition hover:border-red-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Participant list scrolls inside the fixed sidebar panel. */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2.5 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-track]:bg-transparent">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/35">
              <Users size={20} />
            </div>

            <p className="mt-3 text-xs font-semibold text-white/70">
              No participants yet
            </p>

            <p className="mt-1 text-[10px] text-white/35">
              People will appear here when they join.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {participants.map((participant, index) => {
              const participantUser = participant.user;
              const participantId = getUserId(participantUser);

              const participantIsHost =
                participant.role === "host" || participantId === hostId;

              const isOnline = isParticipantOnline(participantId);
              const participantName = getParticipantName(participantUser);

              const avatar = getAvatar(participantUser);

              const showHostActions =
                isHost &&
                !participantIsHost &&
                !isEnded &&
                Boolean(participantId);

              return (
                <motion.div
                  key={participantId || index}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] p-2.5 transition-colors hover:border-white/15 hover:bg-white/[0.045]"
                >
                  {/* User information */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={participantName}
                        className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-950 text-sm font-bold text-white">
                        {participantName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="max-w-[150px] truncate text-xs font-semibold text-white">
                          {participantName}
                        </p>

                        {participantIsHost && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                            <Crown size={11} />
                            Host
                          </span>
                        )}

                        {!participantIsHost && (
                          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40">
                            Viewer
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[10px]">
                        <span
                          className={`flex items-center gap-1.5 ${
                            isOnline ? "text-green-400" : "text-gray-500"
                          }`}
                        >
                          <Circle size={7} fill="currentColor" />
                          {isOnline ? "Online" : "Offline"}
                        </span>

                        {participant.isMuted && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <VolumeX size={12} />
                            Muted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Host Actions */}
                  {showHostActions && (
                    <div className="grid min-w-0 grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => onMute?.(participant)}
                        disabled={actionLoading}
                        className="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 px-1 py-1.5 text-[9px] font-semibold text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                      >
                        {participant.isMuted ? (
                          <Volume2 size={14} />
                        ) : (
                          <VolumeX size={14} />
                        )}

                        {participant.isMuted ? "Unmute" : "Mute"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onTransferHost?.(participant)}
                        disabled={actionLoading}
                        className="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-1 py-1.5 text-[9px] font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-40"
                      >
                        <ArrowRightLeft size={12} />
                        Transfer
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemove?.(participant)}
                        disabled={actionLoading}
                        className="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-1 py-1.5 text-[9px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                      >
                        <UserRoundX size={12} />
                        Remove
                      </button>
                    </div>
                  )}

                  {participantIsHost && (
                    <div className="flex items-center gap-1.5 pl-[46px] text-[10px] text-yellow-500/70">
                      <ShieldCheck size={13} />
                      Room Admin
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.section>
  );
};

export default ParticipantsPanel;
