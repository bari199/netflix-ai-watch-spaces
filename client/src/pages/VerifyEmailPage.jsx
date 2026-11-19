import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, MailCheck } from "lucide-react";
import { verifyEmail } from "../services/auth.service.js";

const statusStyles = {
  loading: {
    ring: "border-white/10 bg-white/[0.05]",
    glow: "bg-red-600/20",
    text: "text-zinc-300",
    title: "Verifying your email",
  },
  success: {
    ring: "border-green-500/30 bg-green-500/10",
    glow: "bg-green-500/20",
    text: "text-green-400",
    title: "Email verified",
  },
  error: {
    ring: "border-red-500/30 bg-red-500/10",
    glow: "bg-red-600/25",
    text: "text-red-400",
    title: "Verification failed",
  },
};

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail(email, token);
        setStatus("success");
        setMessage(response.message || "Email verified successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(
          error.response?.data?.message || "Email verification failed.",
        );
      }
    };

    verify();
  }, [searchParams]);

  const styles = statusStyles[status];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-4 py-10 text-white">
      {/* Background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(229,9,20,0.18),transparent_50%),radial-gradient(ellipse_at_85%_80%,rgba(127,29,29,0.22),transparent_45%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Branding */}
        <Link to="/" className="mb-6 block text-center">
          <span className="text-4xl font-black tracking-[-1.5px] text-[#e50914]">
            NETFLIX
          </span>
          <p className="mt-1.5 text-[10px] font-bold tracking-[3px] text-zinc-500">
            AI WATCH SPACES
          </p>
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-[#111113]/80 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-10">
          {/* Status icon */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <motion.div
              aria-hidden="true"
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full blur-2xl ${styles.glow}`}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border ${styles.ring}`}
              >
                {status === "loading" && (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-9 w-9 rounded-full border-[3px] border-white/15 border-t-red-500"
                  />
                )}

                {status === "success" && (
                  <CheckCircle2 size={40} className="text-green-400" />
                )}

                {status === "error" && (
                  <XCircle size={40} className="text-red-400" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Title + message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              aria-live="polite"
            >
              <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                <MailCheck size={14} />
                Email Verification
              </p>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {styles.title}
              </h1>

              <p className={`mt-3 text-sm leading-6 ${styles.text}`}>
                {message}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Action */}
          <AnimatePresence>
            {status !== "loading" && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="mt-7"
              >
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block w-full"
                >
                  <Link
                    to="/login"
                    className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#e50914] to-red-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-950/40"
                  >
                    Go to Login
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} Netflix AI Watch Spaces. All rights
          reserved.
        </p>
      </motion.div>
    </main>
  );
}

export default VerifyEmailPage;
