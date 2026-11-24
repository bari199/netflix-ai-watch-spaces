import { motion } from "motion/react";
import { Sparkles, BookOpen, Clock3, CheckCircle2 } from "lucide-react";

const formatTimelineTime = (seconds) => {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainingSeconds = value % 60;
  const clock = [minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

  return hours > 0 ? `${hours}:${clock}` : clock;
};

const AIResponse = ({ response = null, sourceEvents = [] }) => {
  if (!response?.answer) return null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 space-y-3"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-white/10">
          <Sparkles size={14} className="text-sky-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-sky-200/90">
            AI Movie Companion
          </p>
          <p className="text-[9px] text-white/35">Based on the story so far</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[9px] text-emerald-300/80">
          <CheckCircle2 size={11} />
          Answer
        </span>
      </div>

      <div className="ml-9 min-w-0">
        <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.8] text-white/85">
          {response.answer}
        </p>
      </div>

      {sourceEvents.length > 0 && (
        <section className="ml-9 border-t border-white/[0.07] pt-3">
          <div className="mb-2 flex items-center gap-1.5">
            <BookOpen size={12} className="text-sky-300/80" />
            <h4 className="text-[10px] font-semibold text-white/60">
              Timeline references
            </h4>
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/40">
              {sourceEvents.length}
            </span>
          </div>

          <div className="space-y-2">
            {sourceEvents.map(({ eventId, timelineEvent }, index) => {
              const eventText =
                timelineEvent?.text ?? timelineEvent?.description;

              return (
                <div
                  key={`${String(eventId)}-${index}`}
                  className="min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-300/70">
                      Source {index + 1}
                    </span>
                    {Number.isFinite(Number(timelineEvent?.startTime)) && (
                      <span className="ml-auto flex items-center gap-1 text-[9px] text-white/35">
                        <Clock3 size={10} />
                        {formatTimelineTime(timelineEvent.startTime)}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-white/55">
                    {typeof eventText === "string" && eventText.trim()
                      ? eventText
                      : "Timeline description is unavailable."}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </motion.article>
  );
};

export default AIResponse;
