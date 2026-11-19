import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Film, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "../../context/AuthContext.jsx";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Manage Titles", path: "/admin/titles", icon: Film },
];

const SidebarContent = ({ user, onLogout, onNavigate, variant }) => (
  <div className="flex h-full flex-col">
    <div className="flex items-center justify-between px-5 pb-6 pt-6">
      <div>
        <span className="text-2xl font-black tracking-[-1.5px] text-[#e50914]">
          NETFLIX
        </span>
        <p className="mt-0.5 text-[10px] font-bold tracking-[3px] text-zinc-500">
          ADMIN CONSOLE
        </p>
      </div>
    </div>

    <nav className="flex flex-1 flex-col gap-1.5 px-3">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        Menu
      </p>

      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-white"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={`admin-nav-active-${variant}`}
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-600 to-red-700 shadow-lg shadow-red-950/40"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>

    <div className="p-4">
      <Separator className="mb-4 bg-white/10" />

      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-800 text-sm font-bold text-white">
          {(user?.name || "A").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {user?.name || "Administrator"}
          </p>
          <p className="text-xs text-zinc-500">Administrator</p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={onLogout}
        className="w-full justify-start gap-2 bg-white/[0.05] text-zinc-300 hover:bg-red-600 hover:text-white"
      >
        <LogOut size={16} />
        Logout
      </Button>
    </div>
  </div>
);

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#101010] md:sticky md:top-0 md:block md:h-screen">
        <SidebarContent user={user} onLogout={handleLogout} variant="desktop" />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#101010]/90 px-4 backdrop-blur-xl md:hidden">
        <span className="text-xl font-black tracking-[-1px] text-[#e50914]">
          NETFLIX
          <span className="ml-1.5 text-[10px] font-bold tracking-[2px] text-zinc-500">
            ADMIN
          </span>
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <Menu size={21} />
        </Button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-white/10 bg-[#101010] shadow-2xl md:hidden"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </Button>
              <SidebarContent
                user={user}
                onLogout={handleLogout}
                onNavigate={() => setMobileOpen(false)}
                variant="mobile"
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
