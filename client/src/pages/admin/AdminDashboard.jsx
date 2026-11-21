import { Link } from "react-router-dom";
import { motion } from "motion/react";

import {
  ArrowRight,
  Film,
  Sparkles,
  Plus,
  ListVideo,
  ShieldCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useAuth } from "../../context/AuthContext.jsx";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* ======================================
          Welcome Banner
      ====================================== */}

      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1c1e] via-[#161617] to-[#241012] p-6 sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-600/20 blur-3xl"
        />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              <Sparkles size={14} />
              Administration
            </p>

            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
              Welcome, {user?.name || "Admin"}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
              Manage your Netflix AI Watch Spaces platform, movies and video
              content.
            </p>
          </div>

          {/* Create Title CTA */}
          <Link to="/admin/titles/create" className="relative shrink-0">
            <Button className="h-11 gap-2 bg-[#e50914] px-5 font-semibold text-white hover:bg-red-700">
              <Plus size={18} />
              Create New Title
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ======================================
          Section Heading
      ====================================== */}

      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>

          <p className="text-sm text-zinc-500">
            Manage your platform content from here.
          </p>
        </div>
      </motion.div>

      {/* ======================================
          Quick Action Cards
      ====================================== */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create Title */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 22,
          }}
        >
          <Link to="/admin/titles/create" className="group block h-full">
            <Card className="h-full border-white/10 bg-[#181818] p-6 text-white shadow-xl shadow-black/20 transition-colors group-hover:border-red-600/70 group-hover:bg-[#1e1e1e]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/15 text-red-500 transition-colors group-hover:bg-red-600 group-hover:text-white">
                <Plus size={24} />
              </div>

              <h3 className="text-xl font-semibold transition-colors group-hover:text-red-500">
                Create New Title
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Add a new movie or video title to your platform.
              </p>

              <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-red-500">
                Create Title
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </p>
            </Card>
          </Link>
        </motion.div>

        {/* Manage Titles */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 22,
          }}
        >
          <Link to="/admin/titles" className="group block h-full">
            <Card className="h-full border-white/10 bg-[#181818] p-6 text-white shadow-xl shadow-black/20 transition-colors group-hover:border-red-600/70 group-hover:bg-[#1e1e1e]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <ListVideo size={24} />
              </div>

              <h3 className="text-xl font-semibold transition-colors group-hover:text-red-500">
                Manage Titles
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                View, update and delete existing movies and video content.
              </p>

              <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-red-500">
                Manage Content
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </p>
            </Card>
          </Link>
        </motion.div>

        {/* Admin Access */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 22,
          }}
        >
          <Card className="h-full border-white/10 bg-[#181818] p-6 text-white shadow-xl shadow-black/20">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/15 text-green-400">
              <ShieldCheck size={24} />
            </div>

            <h3 className="text-xl font-semibold">Admin Access</h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              You are logged in with administrator privileges.
            </p>

            <p className="mt-5 text-sm font-semibold text-green-400">
              Administrator
            </p>
          </Card>
        </motion.div>
      </div>

      {/* ======================================
          Content Management Shortcut
      ====================================== */}

      <motion.div
        variants={itemVariants}
        className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#141414] p-5 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600/10 text-red-500">
            <Film size={22} />
          </div>

          <div>
            <h3 className="font-semibold text-white">Content Management</h3>

            <p className="text-sm text-zinc-500">
              Start managing your Netflix video library.
            </p>
          </div>
        </div>

        <Link to="/admin/titles">
          <Button
            variant="outline"
            className="gap-2 border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
          >
            View All Titles
            <ArrowRight size={16} />
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
