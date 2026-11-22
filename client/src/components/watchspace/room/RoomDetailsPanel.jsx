import { motion } from "motion/react";
import {
  Activity,
  Check,
  Copy,
  Crown,
  Globe,
  LockKeyhole,
  Lock,
  Unlock,
  Users,
  Play,
  DoorOpen,
  DoorClosed,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";

const RoomDetailsPanel = ({
  watchSpace,
  title,
  hostName,
  participantCount = 0,
  currentPlaybackState = "paused",
  isEnded = false,
  isHost = false,
  isParticipant = false,
  actionLoading = false,
  connectionQuality = "checking",
  connectionLatency = null,
  playbackMode = "manual",
  playbackModeSaving = false,
  onPlaybackModeChange,
  copiedInviteCode = false,
  copiedInviteLink = false,
  onCopyInviteCode,
  onCopyInviteLink,
  onJoin,
  onLeave,
  onToggleLock,
  onEnd,
}) => {
  const roomName = watchSpace?.name || title?.name || "WatchSpace";

  const qualityConfig = {
    checking: {
      label: "Checking connection",
      color: "text-white/55",
      icon: Activity,
      dot: "bg-white/40",
    },
    good: {
      label: "Excellent",
      color: "text-emerald-400",
      icon: Wifi,
      dot: "bg-emerald-400",
    },
    fair: {
      label: "Fair",
      color: "text-amber-400",
      icon: Wifi,
      dot: "bg-amber-400",
    },
    poor: {
      label: "Poor",
      color: "text-red-400",
      icon: Wifi,
      dot: "bg-red-400",
    },
    offline: {
      label: "Offline",
      color: "text-red-400",
      icon: WifiOff,
      dot: "bg-red-400",
    },
  };

  const quality = qualityConfig[connectionQuality] || qualityConfig.checking;
  const QualityIcon = quality.icon;

  const details = [
    {
      label: "Room name",
      value: roomName,
      icon: Radio,
    },
    {
      label: "Host",
      value: hostName || "Unknown Host",
      icon: Crown,
    },
    {
      label: "Participants",
      value: `${participantCount} watching`,
      icon: Users,
    },
    {
      label: "Room privacy",
      value: watchSpace?.isPrivate ? "Private" : "Public",
      icon: watchSpace?.isPrivate ? LockKeyhole : Globe,
    },
    {
      label: "Playback",
      value: currentPlaybackState,
      icon: Play,
      capitalize: true,
    },
  ];

  const actionButtonBase =
    "flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex h-full min-h-0 max-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#101010] text-white"
    >
      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.07] bg-gradient-to-br from-red-950/35 via-[#141414] to-[#101010] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
              Your watch party
            </p>
            <h2 className="mt-1 text-base font-bold tracking-tight text-white">
              Room details
            </h2>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              isEnded
                ? "border-white/10 bg-white/[0.05] text-white/45"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isEnded ? "bg-white/30" : "animate-pulse bg-emerald-400"
              }`}
            />
            {isEnded ? "Ended" : "Live"}
          </span>
        </div>
      </header>

      {/* Internal content scroll area */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent sm:p-3.5">
        {/* Room information */}
        <section className="space-y-1">
          {details.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/[0.035]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-white/55">
                    <Icon size={15} />
                  </span>
                  <span className="truncate text-[11px] text-white/50">
                    {item.label}
                  </span>
                </div>

                <span
                  title={String(item.value)}
                  className={`max-w-[58%] truncate text-right text-[11px] font-semibold text-white/85 ${
                    item.capitalize ? "capitalize" : ""
                  }`}
                >
                  {item.value}
                </span>
              </div>
            );
          })}
        </section>

        {/* Host playback mode */}
        {isHost && !isEnded && (
          <section className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
            <div className="mb-2">
              <p className="text-[11px] font-semibold text-white/85">
                Playback mode
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/45">
                Manual lets the host control playback. Automatic follows the title timeline.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/35 p-1">
              {["manual", "automatic"].map((mode) => {
                const selected = playbackMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={playbackModeSaving}
                    aria-pressed={selected}
                    onClick={() => onPlaybackModeChange?.(mode)}
                    className={`rounded-md px-2 py-2 text-[11px] font-semibold capitalize transition disabled:cursor-wait disabled:opacity-50 ${
                      selected
                        ? "bg-red-600 text-white shadow"
                        : "text-white/55 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            {playbackModeSaving && (
              <p className="mt-2 text-[10px] text-white/40">Saving playback mode...</p>
            )}
          </section>
        )}

        {/* Connection status */}
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/85">
                Connection quality
              </p>
              <p
                className={`mt-1 flex items-center gap-1.5 text-[11px] ${quality.color}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${quality.dot}`} />
                {quality.label}
                {connectionLatency !== null && ` · ${connectionLatency} ms`}
              </p>
            </div>
            <QualityIcon size={19} className={quality.color} />
          </div>
        </section>

        {/* Private room invitation */}
        {isHost && watchSpace?.isPrivate && watchSpace?.inviteCode && (
          <section className="rounded-xl border border-red-500/20 bg-red-500/[0.045] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-white">
                  Private room invitation
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  Share this code with your friends
                </p>
              </div>
              <LockKeyhole size={15} className="shrink-0 text-red-400" />
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.06] bg-black/35 px-3 py-2.5 text-sm font-bold tracking-[0.16em] text-red-300">
                {watchSpace.inviteCode}
              </code>
              <button
                type="button"
                onClick={onCopyInviteCode}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[10px] font-bold text-white transition hover:bg-red-500 active:scale-[0.98]"
              >
                {copiedInviteCode ? <Check size={13} /> : <Copy size={13} />}
                {copiedInviteCode ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              type="button"
              onClick={onCopyInviteLink}
              className="mt-2.5 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] px-3 py-2 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/[0.15] active:scale-[0.99]"
            >
              {copiedInviteLink ? <Check size={14} /> : <Copy size={14} />}
              {copiedInviteLink ? "Invite link copied" : "Copy invite link"}
            </button>

            <p className="mt-2.5 text-[10px] leading-relaxed text-white/35">
              Only share this invitation with people you want to join your
              private watch party.
            </p>
          </section>
        )}

        {/* Room actions */}
        {!isEnded && (
          <section className="space-y-2 border-t border-white/[0.08] pt-3">
            {!isParticipant && (
              <button
                type="button"
                onClick={onJoin}
                disabled={actionLoading}
                className={`${actionButtonBase} bg-red-600 text-white shadow-lg shadow-red-950/20 hover:bg-red-500 active:scale-[0.99]`}
              >
                <DoorOpen size={15} />
                {actionLoading ? "Please wait..." : "Join watch party"}
              </button>
            )}

            {isParticipant && !isHost && (
              <button
                type="button"
                onClick={onLeave}
                disabled={actionLoading}
                className={`${actionButtonBase} border border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/[0.1] active:scale-[0.99]`}
              >
                <DoorClosed size={15} />
                Leave room
              </button>
            )}

            {isHost && (
              <>
                <button
                  type="button"
                  onClick={onToggleLock}
                  disabled={actionLoading}
                  className={`${actionButtonBase} border border-white/10 bg-white/[0.045] text-white/80 hover:bg-white/[0.09] active:scale-[0.99]`}
                >
                  {watchSpace?.isLocked ? (
                    <Unlock size={15} />
                  ) : (
                    <Lock size={15} />
                  )}
                  {watchSpace?.isLocked ? "Unlock room" : "Lock room"}
                </button>

                <button
                  type="button"
                  onClick={onEnd}
                  disabled={actionLoading}
                  className={`${actionButtonBase} border border-red-500/20 bg-red-500/[0.07] text-red-300 hover:border-red-500/40 hover:bg-red-600 hover:text-white active:scale-[0.99]`}
                >
                  <DoorClosed size={15} />
                  End WatchSpace
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </motion.aside>
  );
};

export default RoomDetailsPanel;
