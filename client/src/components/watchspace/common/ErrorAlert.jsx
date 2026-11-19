import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";

export default function ErrorAlert({ error, onDismiss }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-200"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-400" />

          <p className="min-w-0 flex-1 break-words text-sm leading-relaxed">
            {error}
          </p>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss error"
              className="shrink-0 rounded-md p-1 text-red-300/60 transition hover:bg-red-500/20 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
