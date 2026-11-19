import { AnimatePresence, motion } from "motion/react";
import { Brain, X, Sparkles } from "lucide-react";

export default function TriviaNotification({
  triviaCards = [],
  watchSpaceId,
  setTriviaCards,
}) {
  const visibleCards = triviaCards.filter(
    (card) => card.watchSpaceId === watchSpaceId,
  );

  const dismissCard = (eventId) => {
    setTriviaCards((previous) =>
      previous.filter((card) => card.eventId !== eventId),
    );
  };

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {visibleCards.map((card) => (
          <motion.div
            key={card.eventId}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="relative overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-r from-[#241B0B] to-[#17130B] p-4 shadow-lg">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl" />

              <div className="relative flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <Brain size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
                      <Sparkles size={11} className="mr-1 inline" />
                      Trivia Moment
                    </span>

                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                      Watch Party
                    </span>
                  </div>

                  <p className="break-words text-sm leading-relaxed text-amber-50/90">
                    {card.text}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => dismissCard(card.eventId)}
                  aria-label="Dismiss trivia notification"
                  className="shrink-0 rounded-md p-1.5 text-amber-200/50 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
