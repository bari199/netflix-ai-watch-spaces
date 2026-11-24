import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles,
  Send,
  LoaderCircle,
  AlertCircle,
  WandSparkles,
  RotateCcw,
} from "lucide-react";
import AIResponse from "./AIResponse.jsx";
import AISuggestedQuestions from "./AISuggestedQuestions.jsx";

const normalizeQuestions = (questions = []) =>
  (Array.isArray(questions) ? questions : [])
    .map((item) => {
      if (typeof item === "string") {
        return { question: item, label: item };
      }

      if (!item || typeof item.question !== "string") return null;
      return {
        ...item,
        label: item.label || item.question,
      };
    })
    .filter(Boolean);

export default function AICopilot({
  aiSuggestedQuestions = [],
  isLoadingAISuggestions = false,
  hasMoreAISuggestions = false,
  onLoadMoreAISuggestions,
  aiQuestion = "",
  setAiQuestion,
  handleAskAI,
  isAskingAI = false,
  currentAiError = "",
  currentAiResponse = null,
  aiSourceEvents = [],
  onAskQuestion,
}) {
  const scrollContainerRef = useRef(null);
  const responseEndRef = useRef(null);
  const [conversation, setConversation] = useState([]);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState("");

  const initialQuestions = useMemo(
    () => normalizeQuestions(aiSuggestedQuestions),
    [aiSuggestedQuestions],
  );

  const latestQuestions = useMemo(
    () => normalizeQuestions(currentAiResponse?.followUpQuestions),
    [currentAiResponse],
  );

  useEffect(() => {
    if (!currentAiResponse?.answer || !currentAiResponse?.question) return;

    const requestId =
      currentAiResponse.requestId ||
      `${currentAiResponse.question}-${currentAiResponse.answer}`;

    setConversation((previous) => {
      if (previous.some((turn) => turn.requestId === requestId)) {
        return previous;
      }

      return [
        ...previous,
        {
          ...currentAiResponse,
          requestId,
          sourceEvents: Array.isArray(aiSourceEvents) ? aiSourceEvents : [],
        },
      ];
    });

    setPendingQuestion("");
    setSelectedQuestion("");
  }, [currentAiResponse, aiSourceEvents]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation, pendingQuestion, isAskingAI, currentAiError]);

  const submitQuestion = (value) => {
    const question = String(value || "").trim();
    if (!question || isAskingAI) return;

    setPendingQuestion(question);
    setSelectedQuestion(question);
    setAiQuestion?.(question);

    if (onAskQuestion) {
      onAskQuestion(question);
    } else if (handleAskAI) {
      handleAskAI(question);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion(aiQuestion);
  };

  const currentSuggestions = conversation.length
    ? latestQuestions
    : initialQuestions;

  const showWelcome =
    conversation.length === 0 && !pendingQuestion && !currentAiError;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex h-full min-h-0 max-h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101114] text-white shadow-xl shadow-black/20"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#15161a] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 via-violet-400/20 to-blue-500/20 ring-1 ring-white/10">
          <Sparkles size={17} className="text-sky-200" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold tracking-tight">
            AI Movie Companion
          </h2>
          <p className="truncate text-[10px] text-white/40">
            Your movie-aware assistant
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-medium text-emerald-300/90">
          Timeline aware
        </span>
      </header>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {showWelcome && (
          <div className="flex min-h-full flex-col justify-center gap-4 py-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/15 to-violet-400/15 ring-1 ring-white/[0.08]">
              <WandSparkles size={23} className="text-sky-200" />
            </div>
            <div className="text-center">
              <h3 className="text-[15px] font-semibold text-white/90">
                What would you like to explore?
              </h3>
              <p className="mx-auto mt-1 max-w-[260px] text-[10px] leading-relaxed text-white/40">
                Pick one of these questions. After each answer, I’ll suggest
                four new questions to continue the conversation.
              </p>
            </div>
          </div>
        )}

        {conversation.length > 0 && (
          <div className="space-y-5">
            {conversation.map((turn) => (
              <div key={turn.requestId} className="min-w-0 space-y-3">
                <div className="ml-6 rounded-2xl rounded-tr-sm border border-white/[0.06] bg-[#25272d] px-3.5 py-3">
                  <p className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/90">
                    {turn.question}
                  </p>
                </div>

                <AIResponse
                  response={turn}
                  sourceEvents={turn.sourceEvents || []}
                />
              </div>
            ))}
            <div ref={responseEndRef} />
          </div>
        )}

        {pendingQuestion && isAskingAI && (
          <div className="mt-4 space-y-3">
            <div className="ml-6 rounded-2xl rounded-tr-sm bg-[#25272d] px-3.5 py-3">
              <p className="break-words text-[12px] text-white/90">
                {pendingQuestion}
              </p>
            </div>
            <div className="flex items-center gap-2.5 pl-1" role="status">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/10">
                <Sparkles size={14} className="animate-pulse text-sky-200" />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <LoaderCircle size={13} className="animate-spin text-sky-300" />
                Thinking about the movie timeline...
              </div>
            </div>
          </div>
        )}

        {currentAiError && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mt-4 flex min-w-0 items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-300" />
            <p className="break-words text-[11px] leading-relaxed text-red-200/90">
              {currentAiError}
            </p>
          </motion.div>
        )}

        {!isAskingAI && !currentAiError && currentSuggestions.length > 0 && (
          <div
            className={
              conversation.length
                ? "mt-5 border-t border-white/[0.07] pt-4"
                : "mt-1"
            }
          >
            <AISuggestedQuestions
              questions={currentSuggestions}
              selectedQuestion={selectedQuestion}
              onSelect={submitQuestion}
              isLoading={isLoadingAISuggestions}
            />
            {hasMoreAISuggestions && (
              <button
                type="button"
                onClick={onLoadMoreAISuggestions}
                disabled={isLoadingAISuggestions}
                className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-[10px] font-medium text-white/65 transition hover:border-sky-300/30 hover:text-sky-200 disabled:opacity-40"
              >
                {isLoadingAISuggestions ? "Loading..." : "Load more questions"}
              </button>
            )}
          </div>
        )}

        {!isAskingAI &&
          !currentAiError &&
          conversation.length > 0 &&
          currentSuggestions.length === 0 && (
            <p className="mt-4 pl-9 text-[10px] text-white/35">
              You can ask another question using the message box below.
            </p>
          )}

        <div ref={responseEndRef} />
      </div>

      <footer className="shrink-0 border-t border-white/[0.08] bg-[#141519] p-3">
        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 items-end gap-2 rounded-2xl border border-white/[0.10] bg-[#202126] p-2 transition focus-within:border-sky-300/35 focus-within:ring-2 focus-within:ring-sky-300/[0.06]"
        >
          <textarea
            value={aiQuestion}
            onChange={(event) => setAiQuestion?.(event.target.value)}
            rows={1}
            maxLength={1000}
            placeholder="Ask anything about this movie..."
            disabled={isAskingAI}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="max-h-28 min-h-10 min-w-0 flex-1 resize-y bg-transparent px-2 py-2.5 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/35 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!aiQuestion?.trim() || isAskingAI}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#151515] transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isAskingAI ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <p className="text-[9px] text-white/30">
            Answers use available movie timeline references.
          </p>
          <span className="shrink-0 text-[9px] text-white/25">
            Enter to send · Shift + Enter for new line
          </span>
        </div>
      </footer>
    </motion.section>
  );
}
