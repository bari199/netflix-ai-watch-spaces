import { motion } from "motion/react";
import { MessageCircleQuestion, Sparkles } from "lucide-react";

const AISuggestedQuestions = ({
  questions = [],
  selectedQuestion = "",
  isLoading = false,
  onSelect,
}) => {
  const visibleQuestions = questions;

  if (!visibleQuestions.length && !isLoading) return null;

  return (
    <section className="min-w-0 space-y-2.5" aria-label="Suggested questions">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
          <Sparkles size={14} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold text-white/80">
            {selectedQuestion ? "Explore further" : "Try asking"}
          </h3>
          <p className="text-[9px] text-white/35">
            Choose one question to continue
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-white/[0.07] px-2 py-0.5 text-[9px] text-white/40">
          {visibleQuestions.length || 4} questions
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-[58px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.035]"
            />
          ))}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-2">
          {visibleQuestions.map((item, index) => {
            const question = typeof item === "string" ? item : item?.question;
            if (!question) return null;

            const label =
              typeof item === "string" ? item : item?.label || item?.question;
            const description =
              typeof item === "object" ? item?.description : "";

            return (
              <motion.button
                key={item?.type || question}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelect?.(question)}
                disabled={isLoading}
                className={`group flex w-full min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                  selectedQuestion === question
                    ? "border-sky-400/35 bg-sky-400/[0.08]"
                    : "border-white/[0.08] bg-white/[0.025] hover:border-sky-400/25 hover:bg-sky-400/[0.045]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[12px] text-sky-200/80">
                  {item?.icon || <MessageCircleQuestion size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[11px] font-medium leading-relaxed text-white/80 group-hover:text-white">
                    {label}
                  </span>
                  {description && (
                    <span className="mt-0.5 block break-words text-[9px] leading-relaxed text-white/35">
                      {description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 pt-1 text-[10px] text-white/20 group-hover:text-sky-200">
                  ↗
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AISuggestedQuestions;
