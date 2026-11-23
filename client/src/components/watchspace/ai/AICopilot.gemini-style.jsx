import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles,
  Send,
  Clock3,
  Bot,
  MessageCircleQuestion,
  LoaderCircle,
  AlertCircle,
  RotateCcw,
  WandSparkles,
} from "lucide-react";

export default function AICopilot({
  aiSuggestedQuestions = [],
  aiQuestion,
  setAiQuestion,
  handleAskAI,
  isAskingAI = false,
  currentAiError,
  currentAiResponse,
  aiSourceEvents = [],
}) {
  const responseEndRef = useRef(null);

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [currentAiResponse, currentAiError, isAskingAI]);

  const submitQuestion = (question) => {
    if (!question?.trim() || isAskingAI) return;
    setAiQuestion(question);
    // Let the existing controlled state update before submitting through the
    // same parent handler used by the composer.
    requestAnimationFrame(() => {
      const form = document.getElementById("ai-copilot-form");
      form?.requestSubmit();
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex h-full min-h-0 max-h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#101010] text-white shadow-lg shadow-black/20"
    >
      {/* Gemini-inspired compact assistant header */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-white/10 bg-[#141414] px-3.5 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-red-500/20 ring-1 ring-white/10">
          <Sparkles size={16} className="text-sky-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold tracking-tight text-white">
            AI Movie Companion
          </h2>
          <p className="truncate text-[10px] text-white/40">
            Ask about the story so far
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-sky-400/15 bg-sky-400/[0.07] px-2 py-1 text-[9px] font-semibold text-sky-300">
          Timeline AI
        </span>
      </header>

      {/* Conversation area: the only scrolling region */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
        {!currentAiResponse && !currentAiError && !isAskingAI && (
          <div className="flex min-h-full flex-col justify-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 via-violet-500/15 to-red-500/10 ring-1 ring-white/[0.07]">
              <WandSparkles size={23} className="text-sky-300" />
            </div>
            <h3 className="mt-3 text-center text-sm font-semibold text-white/90">
              What would you like to know?
            </h3>
            <p className="mx-auto mt-1 max-w-[250px] text-center text-[11px] leading-relaxed text-white/40">
              Explore characters, scenes and story details up to the current playback moment.
            </p>

            {aiSuggestedQuestions.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="mb-2 flex items-center gap-1.5 px-1">
                  <MessageCircleQuestion size={12} className="text-sky-300" />
                  <span className="text-[10px] font-semibold text-white/55">
                    Try asking
                  </span>
                </div>
                {aiSuggestedQuestions.map((item, index) => (
                  <motion.button
                    key={item.type || item.question || index}
                    type="button"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.035 }}
                    onClick={() => submitQuestion(item.question)}
                    disabled={isAskingAI}
                    className="group flex w-full min-w-0 items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-left transition hover:border-sky-400/25 hover:bg-sky-400/[0.045] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="mt-0.5 shrink-0 text-sm">
                      {item.icon || "✨"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[11px] font-medium leading-relaxed text-white/80 group-hover:text-white">
                        {item.label || item.question}
                      </span>
                      {item.description && (
                        <span className="mt-0.5 block break-words text-[10px] leading-relaxed text-white/35">
                          {item.description}
                        </span>
                      )}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentAiResponse && (
            <motion.div
              key={currentAiResponse.requestId || currentAiResponse.answer}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
              aria-live="polite"
            >
              {aiQuestion?.trim() && (
                <div className="ml-5 rounded-2xl rounded-tr-sm bg-[#252525] px-3.5 py-2.5">
                  <p className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/90">
                    {aiQuestion}
                  </p>
                </div>
              )}

              <div className="flex min-w-0 items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-white/10">
                  <Sparkles size={14} className="text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-[10px] font-semibold text-sky-200/80">
                    AI Movie Companion
                  </p>
                  <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.75] text-white/85">
                    {currentAiResponse.answer ||
                      "No answer was returned for this question."}
                  </p>
                </div>
              </div>

              {aiSourceEvents.length > 0 && (
                <section className="ml-9 border-t border-white/[0.07] pt-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Clock3 size={12} className="text-sky-300/80" />
                    <h3 className="text-[10px] font-semibold text-white/60">
                      Timeline references
                    </h3>
                    <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/40">
                      {aiSourceEvents.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {aiSourceEvents.map(({ eventId, timelineEvent }, index) => {
                      const eventText =
                        timelineEvent?.text ?? timelineEvent?.description;
                      return (
                        <div
                          key={`${String(eventId)}-${index}`}
                          className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
                        >
                          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-sky-300/70">
                            Reference {index + 1}
                          </p>
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
              <div ref={responseEndRef} />
            </motion.div>
          )}
        </AnimatePresence>

        {currentAiError && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex min-w-0 items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-300" />
            <p className="break-words text-[11px] leading-relaxed text-red-200/85">
              {currentAiError}
            </p>
          </motion.div>
        )}

        {isAskingAI && (
          <div className="flex items-start gap-2.5 py-2" role="status">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/10">
              <Sparkles size={14} className="animate-pulse text-sky-300" />
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-white/55">
                <LoaderCircle size={13} className="animate-spin text-sky-300" />
                Checking the movie timeline...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed composer, never scrolls with the conversation */}
      <footer className="shrink-0 border-t border-white/10 bg-[#121212] p-3">
        <form
          id="ai-copilot-form"
          onSubmit={handleAskAI}
          className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#1b1b1b] p-2 transition focus-within:border-sky-400/35"
        >
          <textarea
            id="ai-copilot-question"
            rows={1}
            value={aiQuestion}
            onChange={(event) => setAiQuestion(event.target.value)}
            maxLength={1000}
            placeholder="Ask anything about this movie..."
            disabled={isAskingAI}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="max-h-24 min-h-9 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/35 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!aiQuestion?.trim() || isAskingAI}
            aria-label="Send question to AI"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#111] transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isAskingAI ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <p className="text-[9px] leading-relaxed text-white/30">
            AI can make mistakes. Check timeline references.
          </p>
          <span className="shrink-0 text-[9px] text-white/25">
            Enter to send
          </span>
        </div>
      </footer>
    </motion.section>
  );
}
