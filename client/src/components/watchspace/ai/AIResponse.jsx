import { motion } from "motion/react";
import {
  Sparkles,
  BookOpen,
  AlertCircle,
  Clock3,
  CheckCircle2,
} from "lucide-react";

const AIResponse = ({
  response = null,
  sourceEvents = [],
  error = "",
  isLoading = false,
}) => {
  const getEventText = (timelineEvent) => {
    if (timelineEvent?.text !== undefined && timelineEvent?.text !== null) {
      return timelineEvent.text;
    }

    return timelineEvent?.description;
  };

  return (
    <div className="mt-5 space-y-5" aria-live="polite">
      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#101010] p-4"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <Sparkles size={18} className="animate-pulse" />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              AI is thinking...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Checking the title timeline...
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!response && !error && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#101010] px-5 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-gray-500">
            <Sparkles size={22} />
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-300">
            Your AI answer will appear here
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Ask a question about the story so far.
          </p>
        </div>
      )}

      {/* AI Answer */}
      {response && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#101010]"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <Sparkles size={18} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">AI Answer</h3>
              <p className="text-xs text-gray-500">
                Grounded in title timeline metadata
              </p>
            </div>

            <div className="ml-auto flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 size={14} />
              <span>Generated</span>
            </div>
          </div>

          <div className="p-5">
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-200">
              {response.answer || "No answer was returned for this question."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Timeline Sources */}
      {response && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={17} className="text-red-400" />

            <h3 className="text-sm font-semibold text-white">
              Timeline Sources
            </h3>

            {sourceEvents.length > 0 && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400">
                {sourceEvents.length}
              </span>
            )}
          </div>

          {sourceEvents.length > 0 ? (
            <div className="space-y-3">
              {sourceEvents.map(({ eventId, timelineEvent }, index) => {
                const eventText = getEventText(timelineEvent);

                return (
                  <motion.article
                    key={`${String(eventId)}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-white/10 bg-[#1b1b1b] p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/15 text-xs font-bold text-red-400">
                        {index + 1}
                      </span>

                      <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Source {index + 1}
                      </span>

                      <Clock3 size={13} className="ml-auto text-gray-600" />
                    </div>

                    {typeof eventText === "string" && eventText.trim() ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">
                        {eventText}
                      </p>
                    ) : (
                      <p className="text-sm italic text-gray-500">
                        Timeline description is unavailable.
                      </p>
                    )}
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
              No supporting timeline events were returned.
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AIResponse;
