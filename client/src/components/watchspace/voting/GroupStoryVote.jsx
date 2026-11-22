import { motion } from "motion/react";
import {
  GitBranch,
  Vote,
  Clock3,
  CheckCircle2,
  Trophy,
  Play,
  LoaderCircle,
} from "lucide-react";

export default function GroupStoryVote({
  isParticipant = false,
  isHost = false,
  isEnded = false,
  votingEnabled = false,
  playbackMode = "manual",
  playbackModeSaving = false,
  onPlaybackModeChange,

  activeVote,
  voteSecondsLeft = 0,

  variationPoints = [],
  selectedVariationId,
  setSelectedVariationId,

  voteDuration,
  setVoteDuration,

  handleStartVote,
  handleCastVote,

  selectedVoteOption,
  voteLoading = false,
  voteMessage,
  voteResult,
}) {
  if (!isParticipant || isEnded || !votingEnabled) {
    return null;
  }

  const selectedVariation = variationPoints.find(
    (point) => String(point.variationId) === String(activeVote?.variationId),
  );

  const isVoteOpen = activeVote?.status === "open";
  const isVoteClosed = activeVote?.status === "closed";
  const isVoteApplied = activeVote?.status === "applied";

  const winningOption = activeVote?.options?.find(
    (option) =>
      option.id ===
      (voteResult?.winningOptionId || activeVote?.winningOptionId),
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full overflow-hidden rounded-xl border border-white/10 bg-[#111111] shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#211010] to-[#151515] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/15 text-red-500">
            <GitBranch size={19} />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white">Group Story Vote</h2>

            <p className="text-[10px] text-white/40">
              Choose between pre-approved story variations
            </p>
          </div>
        </div>

        {isVoteOpen ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1.5 text-[9px] font-bold text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            {voteSecondsLeft}s
          </span>
        ) : isVoteClosed ? (
          <span className="shrink-0 rounded-full bg-yellow-500/10 px-2.5 py-1.5 text-[9px] font-bold text-yellow-300">
            CLOSED
          </span>
        ) : isVoteApplied ? (
          <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1.5 text-[9px] font-bold text-blue-300">
            APPLIED
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1.5 text-[9px] text-white/40">
            READY
          </span>
        )}
      </div>

      <div className="space-y-4 p-4">
        {/* Voting mode belongs to the Group Story Vote panel. */}
        <section className="rounded-lg border border-white/10 bg-[#191919] p-3">
          <div className="mb-2">
            <p className="text-xs font-bold text-white">Voting mode</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/45">
              {playbackMode === "automatic"
                ? "Polls start when playback reaches a timeline marker. Each poll stays open for 60 seconds while the video continues."
                : "The host chooses a story variation and starts each poll manually."}
            </p>
          </div>

          {isHost ? (
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
          ) : (
            <p className="text-[10px] font-semibold capitalize text-red-300">
              {playbackMode} mode
            </p>
          )}
          {playbackModeSaving && (
            <p className="mt-2 text-[10px] text-white/40">Saving voting mode...</p>
          )}
        </section>

        {/* Host: Start a vote manually */}
        {playbackMode === "manual" && isHost && !isVoteOpen && variationPoints.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-[#191919] p-3">
            <div className="mb-3 flex items-center gap-2">
              <Vote size={15} className="text-red-400" />
              <h3 className="text-xs font-bold text-white">
                Start a group vote
              </h3>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] text-white/45">
                  Story variation
                </span>

                <select
                  value={selectedVariationId}
                  onChange={(event) =>
                    setSelectedVariationId(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#090909] px-3 py-2.5 text-xs text-white outline-none focus:border-red-500/60"
                >
                  <option value="">Select a story variation</option>

                  {variationPoints.map((point) => (
                    <option key={point.variationId} value={point.variationId}>
                      {point.description || point.variationId}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] text-white/45">
                  Voting duration
                </span>

                <select
                  value={voteDuration}
                  onChange={(event) =>
                    setVoteDuration(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#090909] px-3 py-2.5 text-xs text-white outline-none focus:border-red-500/60"
                >
                  {[15, 30, 45, 60, 90, 120].map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds} seconds
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleStartVote}
                disabled={voteLoading || !selectedVariationId || isVoteOpen}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {voteLoading ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Play size={13} fill="currentColor" />
                )}

                {voteLoading ? "Please wait..." : "Start Vote"}
              </button>
            </div>
          </div>
        )}

        {/* Active vote */}
        {activeVote?.options?.length > 0 ? (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Current variation
              </p>

              <p className="mt-1 text-xs font-semibold text-white/85">
                {selectedVariation?.description?.trim() || "Story variation"}
              </p>

              {isVoteOpen && (
                <p className="mt-1 text-[10px] leading-relaxed text-white/40">
                  Select an option below. You can change your vote before time
                  runs out.
                </p>
              )}
            </div>

            <div className="space-y-2">
              {activeVote.options.map((option) => {
                const isSelected = selectedVoteOption === option.id;

                const isWinner =
                  activeVote.winningOptionId === option.id ||
                  voteResult?.winningOptionId === option.id;

                const voteCount = activeVote.voteCounts?.[option.id];

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleCastVote(option.id)}
                    disabled={!isVoteOpen || voteLoading || !isParticipant}
                    className={`group w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? "border-red-500/60 bg-red-500/10"
                        : isWinner
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-white/10 bg-[#191919] hover:border-white/25 hover:bg-[#202020]"
                    } disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white/85">
                        {option.label}
                      </span>

                      {isSelected && (
                        <span className="shrink-0 text-[9px] font-bold text-red-400">
                          YOUR VOTE
                        </span>
                      )}

                      {!isSelected && isWinner && (
                        <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-green-400">
                          <Trophy size={11} />
                          WINNER
                        </span>
                      )}
                    </div>

                    {!isVoteOpen && (
                      <p className="mt-2 text-[10px] text-white/40">
                        {voteCount ?? 0} vote(s)
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#0B0B0B] p-4 text-center">
            <Vote size={23} className="mb-2 text-white/20" />

            <p className="text-xs font-semibold text-white/65">
              No active group vote
            </p>

            <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-white/35">
              The Host can start a vote when a pre-approved variation is
              available.
            </p>
          </div>
        )}

        {/* Status messages */}
        {voteMessage && (
          <p
            role="status"
            className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/65"
          >
            {voteMessage}
          </p>
        )}

        {voteResult?.winningOptionId && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center gap-2 text-green-400">
              <Trophy size={14} />
              <span className="text-xs font-bold">Winning option</span>
            </div>

            <p className="mt-1 text-xs text-white/75">
              {winningOption?.label || voteResult.winningOptionId}
            </p>

            {Number.isFinite(Number(voteResult.applyAtSeconds)) && (
              <p className="mt-2 flex items-center gap-1 text-[10px] text-white/40">
                <Clock3 size={11} />
                Scheduled point: {Math.floor(voteResult.applyAtSeconds)}s
              </p>
            )}
          </div>
        )}

        {isVoteApplied && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <CheckCircle2 size={15} className="shrink-0 text-blue-400" />
            <p className="text-[10px] leading-relaxed text-blue-300">
              The selected variation has been marked as applied for this
              WatchSpace.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
