import { motion, AnimatePresence } from "motion/react";
import { WifiOff, AlertTriangle } from "lucide-react";

export default function HostDisconnectedAlert({ hostDisconnected = false }) {
  return (
    <AnimatePresence>
      {hostDisconnected && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="status"
          className="flex items-start gap-3 rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400">
            <WifiOff size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-yellow-400" />
              <h3 className="text-sm font-semibold text-yellow-200">
                Host disconnected
              </h3>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-yellow-100/65">
              The host has disconnected. Playback has been paused for everyone.
              Please wait for the host to reconnect.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-yellow-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-yellow-300">
            Offline
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
