import { motion } from "motion/react";
import { MonitorPlay, LoaderCircle } from "lucide-react";

export default function LoadingScreen({
  message = "Preparing your Watch Space...",
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] px-5 text-white">
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-600/10"
        >
          <MonitorPlay size={38} className="text-red-500" />
        </motion.div>

        <h1 className="text-xl font-black tracking-wide">
          NETFLIX <span className="text-red-600">WATCH SPACES</span>
        </h1>

        <div className="mt-5 flex items-center gap-2 text-sm text-white/50">
          <LoaderCircle size={16} className="animate-spin text-red-500" />
          {message}
        </div>

        <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full w-1/2 rounded-full bg-red-600"
          />
        </div>
      </div>
    </div>
  );
}
