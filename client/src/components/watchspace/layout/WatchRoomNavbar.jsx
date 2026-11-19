import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Radio } from "lucide-react";

const WatchRoomNavbar = ({ user }) => {
  const userName = user?.name || user?.fullName || "User";

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-white/10 bg-[#080808]/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-4 sm:gap-7">
          <Link
            to="/watch-spaces"
            className="group flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
          >
            <ArrowLeft
              size={17}
              className="transition-transform group-hover:-translate-x-1"
            />
            <span className="hidden sm:inline">Watch Spaces</span>
          </Link>

          <div className="h-6 w-px bg-white/15" />

          <Link to="/watch-spaces" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-red-600 sm:text-2xl">
              NETFLIX
            </span>

            <span className="hidden text-xs font-semibold tracking-[0.18em] text-white sm:inline">
              WATCH SPACES
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 sm:flex">
            <Radio size={14} className="text-red-500" />
            <span className="text-xs font-medium text-red-400">
              WATCH TOGETHER
            </span>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-red-600 to-red-900 text-sm font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>

          <span className="hidden max-w-32 truncate text-sm font-medium text-gray-200 sm:block">
            {userName}
          </span>
        </div>
      </div>
    </motion.header>
  );
};

export default WatchRoomNavbar;
