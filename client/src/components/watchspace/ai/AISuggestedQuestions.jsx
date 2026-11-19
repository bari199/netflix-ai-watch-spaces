import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

const AISuggestedQuestions = ({
  questions = [],
  selectedQuestion = "",
  isLoading = false,
  onSelect,
}) => {
  if (!questions.length) return null;

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
          <Sparkles size={16} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">
            Suggested Questions
          </h3>
          <p className="text-xs text-gray-500">Explore the story with AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {questions.map((item, index) => {
          const isSelected = selectedQuestion === item.question;

          return (
            <motion.button
              key={item.type || item.question}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={!isLoading ? { y: -3 } : undefined}
              whileTap={!isLoading ? { scale: 0.98 } : undefined}
              onClick={() => onSelect?.(item.question)}
              disabled={isLoading}
              className={`group rounded-xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-red-500/60 bg-red-500/10 shadow-lg shadow-red-950/20"
                  : "border-white/10 bg-[#1b1b1b] hover:border-red-500/40 hover:bg-[#222]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-2xl transition group-hover:bg-red-500/10">
                {item.icon || "✨"}
              </span>

              <span className="block text-sm font-semibold text-white">
                {item.label}
              </span>

              <span className="mt-1.5 block text-xs leading-relaxed text-gray-400">
                {item.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default AISuggestedQuestions;
