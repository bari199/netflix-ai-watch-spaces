import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/AuthContext";

import {
  Search,
  Bell,
  UserRound,
  ChevronDown,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Users,
  UserPlus,
} from "lucide-react";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Watch Spaces", path: "/watch-spaces" },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);

  // ==========================================
  // Search Handler
  // ==========================================

  const handleSearch = (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) return;

    navigate(`/watch-spaces?search=${encodeURIComponent(query)}`);

    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  // ==========================================
  // Logout Handler
  // ==========================================

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <motion.header
      initial={{ y: -75, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/90 backdrop-blur-2xl"
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        {/* ======================================
            Brand and Navigation
        ====================================== */}

        <div className="flex min-w-0 items-center gap-8 lg:gap-10">
          <Link to="/" className="shrink-0">
            <span className="text-2xl font-black tracking-[-1.5px] text-[#e50914] sm:text-3xl">
              NETFLIX
            </span>

            <span className="ml-1.5 hidden text-[10px] font-bold tracking-[2px] text-zinc-400 sm:inline">
              AI WATCH SPACES
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `relative py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-white" : "text-zinc-400 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}

                    {isActive && (
                      <motion.span
                        layoutId="navbar-active"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-[#e50914]"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ======================================
            Right Actions
        ====================================== */}

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden items-center sm:flex">
            <AnimatePresence initial={false}>
              {searchOpen && (
                <motion.input
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 190, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search Watch Spaces..."
                  aria-label="Search Watch Spaces"
                  autoFocus
                  className="min-w-0 rounded-l-lg border border-r-0 border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-500/60"
                />
              )}
            </AnimatePresence>

            <button
              type={searchOpen ? "submit" : "button"}
              onClick={() => {
                if (!searchOpen) setSearchOpen(true);
              }}
              aria-label="Search"
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white ${
                searchOpen
                  ? "rounded-l-none border border-white/10 bg-white/[0.06]"
                  : ""
              }`}
            >
              <Search size={19} />
            </button>
          </form>

          {/* Mobile Search */}
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label="Toggle search"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white sm:hidden"
          >
            <Search size={19} />
          </button>

          {/* ======================================
              Authenticated User
          ====================================== */}

          {user ? (
            <>
              <button
                type="button"
                aria-label="Notifications"
                className="hidden rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white sm:block"
              >
                <Bell size={19} />
              </button>

              {/* Profile Dropdown */}
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => setAuthDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/[0.06]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-800 text-white shadow-lg shadow-red-950/30">
                    <UserRound size={17} />
                  </div>

                  <span className="hidden max-w-28 truncate text-sm font-medium text-zinc-300 sm:block">
                    {user.name}
                  </span>

                  <ChevronDown
                    size={15}
                    className={`hidden text-zinc-400 transition-transform sm:block ${
                      authDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {authDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-[#18181b] p-2 shadow-2xl"
                    >
                      <div className="border-b border-white/10 px-3 py-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {user.name}
                        </p>

                        <p className="text-xs text-zinc-500">
                          {user.role === "admin"
                            ? "Administrator"
                            : "Your account"}
                        </p>
                      </div>

                      {user.role !== "admin" && (
                        <Link
                          to="/profile"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="mt-2 block rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                        >
                          My Profile
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* ======================================
                Login Dropdown
            ====================================== */

            <div className="relative">
              <button
                type="button"
                onClick={() => setAuthDropdownOpen((prev) => !prev)}
                aria-expanded={authDropdownOpen}
                className="flex items-center gap-2 rounded-lg bg-[#e50914] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-[#f6121d] sm:px-5"
              >
                Sign In
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    authDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {authDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#18181b] p-2 shadow-2xl"
                  >
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-white">
                        Welcome Back
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        Choose your account type
                      </p>
                    </div>

                    {/* User Login */}
                    <Link
                      to="/login"
                      onClick={() => setAuthDropdownOpen(false)}
                      className="mt-2 flex items-center gap-3 rounded-lg p-3 transition hover:bg-white/[0.06]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                        <Users size={20} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          User Login
                        </p>

                        <p className="text-xs text-zinc-500">
                          Viewer / Host account
                        </p>
                      </div>
                    </Link>

                    {/* Admin Login */}
                    <Link
                      to="/admin/login"
                      onClick={() => setAuthDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-3 transition hover:bg-red-500/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                        <ShieldCheck size={20} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          Admin Login
                        </p>

                        <p className="text-xs text-zinc-500">
                          Administrator access
                        </p>
                      </div>
                    </Link>

                    <div className="my-2 border-t border-white/10" />

                    {/* Register */}
                    <Link
                      to="/register"
                      onClick={() => setAuthDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <UserPlus size={16} />
                      Create a new account
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ======================================
              Mobile Menu Button
          ====================================== */}

          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/10 md:hidden"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {/* ======================================
          Mobile Search Field
      ====================================== */}

      <AnimatePresence>
        {searchOpen && (
          <motion.form
            onSubmit={handleSearch}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 px-5 py-3 sm:hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3">
              <Search size={17} className="text-zinc-500" />

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search Watch Spaces..."
                aria-label="Search Watch Spaces"
                className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />

              <button
                type="submit"
                aria-label="Submit search"
                className="text-red-400"
              >
                <Search size={18} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ======================================
          Mobile Navigation
      ====================================== */}

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-[#111113] px-5 md:hidden"
          >
            <div className="py-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `mb-1 block rounded-lg px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-red-500/10 text-red-400"
                        : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {!user && (
                <>
                  <div className="my-3 border-t border-white/10" />

                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Account Access
                  </p>

                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-zinc-300 hover:bg-white/[0.05]"
                  >
                    <Users size={17} />
                    User Login
                  </Link>

                  <Link
                    to="/admin/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <ShieldCheck size={17} />
                    Admin Login
                  </Link>

                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-zinc-300 hover:bg-white/[0.05]"
                  >
                    <UserPlus size={17} />
                    Create Account
                  </Link>
                </>
              )}

              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
