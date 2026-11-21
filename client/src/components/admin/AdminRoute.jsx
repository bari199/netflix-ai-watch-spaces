import { Navigate, Outlet } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext.jsx";

const AdminRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0b0b0c] text-white">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-black tracking-[-1.5px] text-[#e50914]"
        >
          NETFLIX
        </motion.span>
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-[3px] border-white/10 border-t-red-500"
        />
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
