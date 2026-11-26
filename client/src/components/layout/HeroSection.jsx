import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

import { Play, Users, Sparkles, ArrowRight, Clapperboard } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import heroImage from "@/assets/hero.png";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

const HeroSection = () => {
  const { user } = useAuth();

  // Typewriter animation
  const fullHeading = "Every Screen. Every Friend. One Experience.";
  const [typedHeading, setTypedHeading] = useState("");

  useEffect(() => {
    let index = 0;

    const typingInterval = setInterval(() => {
      index++;

      setTypedHeading(fullHeading.slice(0, index));

      if (index >= fullHeading.length) {
        clearInterval(typingInterval);
      }
    }, 65);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <section className="relative isolate min-h-[560px] overflow-hidden bg-[#09090b] sm:min-h-[650px]">
      {/* Cinematic background */}
      <motion.div
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 -z-20"
      >
        <img
          src={heroImage}
          alt="Cinematic movie background"
          className="h-full w-full object-cover object-center"
        />
      </motion.div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#09090b] via-[#09090b]/85 to-[#09090b]/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#09090b] via-transparent to-[#09090b]/30" />

      {/* Subtle red ambient glow */}
      <motion.div
        animate={{
          opacity: [0.15, 0.3, 0.15],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -left-32 top-1/3 -z-10 h-80 w-80 rounded-full bg-red-600/20 blur-[120px]"
      />

      <div className="mx-auto flex min-h-[560px] max-w-[1440px] items-center px-5 py-20 sm:min-h-[650px] sm:px-8 lg:px-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl"
        >
          {/* Eyebrow */}
          <motion.div
            variants={itemVariants}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold tracking-wider text-red-400 backdrop-blur-md"
          >
            <Sparkles size={14} />
            THE ULTIMATE SOCIAL WATCH EXPERIENCE
          </motion.div>

          {/* Main heading with Typewriter Animation */}
          <motion.h1
            variants={itemVariants}
            className="text-balance text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl"
            aria-label={fullHeading}
          >
            {typedHeading.split(" ").map((word, index, words) => (
              <span
                key={index}
                className={
                  word === "Experience."
                    ? "bg-gradient-to-r from-[#ff2633] via-[#e50914] to-[#a8000a] bg-clip-text text-transparent"
                    : ""
                }
              >
                {word}
                {index < words.length - 1 ? " " : ""}
              </span>
            ))}

            {/* Blinking typing cursor */}
            <span
              className="ml-1 inline-block h-[0.85em] w-[3px] translate-y-1 animate-pulse bg-[#e50914]"
              aria-hidden="true"
            />
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg"
          >
            Watch your favorite movies together, share reactions in real time,
            and create unforgettable moments — wherever your friends are.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-9 flex flex-wrap gap-3"
          >
            <motion.div
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              <Link
                to="/watch-spaces"
                className="inline-flex items-center gap-2 rounded-xl bg-[#e50914] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-red-950/40 transition-colors hover:bg-[#ff1b26]"
              >
                <Play size={17} fill="currentColor" />
                Explore Watch Spaces
              </Link>
            </motion.div>

            {user && (
              <motion.div
                whileHover={{ y: -4, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
              >
                <Link
                  to="/watch-spaces/create"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-white/40 hover:bg-white/20"
                >
                  <Users size={17} />
                  Create a Space
                  <ArrowRight size={15} />
                </Link>
              </motion.div>
            )}
          </motion.div>

          {/* Bottom highlight */}
          <motion.div
            variants={itemVariants}
            className="mt-11 flex items-center gap-3 text-sm text-zinc-400"
          >
            <div className="flex -space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#18181b] bg-red-600">
                <Users size={13} className="text-white" />
              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#18181b] bg-blue-600">
                <Play size={12} className="text-white" />
              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#18181b] bg-purple-600">
                <Sparkles size={13} className="text-white" />
              </span>
            </div>

            <span>
              Better together. <strong className="text-white">Always.</strong>
            </span>
          </motion.div>

          {/* Bottom tagline */}
          <motion.div
            variants={itemVariants}
            className="mt-7 flex items-center gap-2 text-xs font-medium uppercase tracking-[2px] text-zinc-500"
          >
            <Clapperboard size={15} />
            Your movie. Your people. Your space.
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
