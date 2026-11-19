import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Film, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "../../context/AuthContext.jsx";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
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
      {/* Welcome banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1c1e] via-[#161617] to-[#241012] p-6 sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-600/20 blur-3xl"
        />

        <p className="relative inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
          <Sparkles size={14} />
          Administration
        </p>

        <h1 className="relative mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
          Welcome, {user?.name || "Admin"}
        </h1>

        <p className="relative mt-2 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
          Manage your Netflix AI Watch Spaces content.
        </p>
      </motion.div>

      {/* Quick access */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        >
          <Link to="/admin/titles" className="group block h-full">
            <Card className="h-full border-white/10 bg-[#181818] p-6 text-white shadow-xl shadow-black/20 transition-colors group-hover:border-red-600/70 group-hover:bg-[#1e1e1e]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/15 text-red-500 transition-colors group-hover:bg-red-600 group-hover:text-white">
                <Film size={24} />
              </div>

              <h2 className="text-xl font-semibold transition-colors group-hover:text-red-500">
                Manage Titles
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Create, view, update and delete movies and video content.
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
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
