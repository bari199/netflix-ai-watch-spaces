import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/axios";
import {
  Search,
  Bell,
  UserRound,
  ChevronDown,
  Menu,
  X,
  LogOut,
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
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");

  const userName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Account";

  // Load authenticated user's avatar from MinIO through backend
  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    const loadAvatar = async () => {
      if (!user?.avatar) {
        setAvatarUrl("");
        return;
      }

      try {
        const response = await api.get("/users/me/avatar", {
          responseType: "blob",
        });

        if (cancelled) return;

        objectUrl = URL.createObjectURL(response.data);
        setAvatarUrl(objectUrl);
      } catch (error) {
        if (!cancelled) {
          setAvatarUrl("");
          console.error("Navbar avatar loading failed:", error);
        }
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [user?.avatar]);

  const handleSearch = (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) return;

    navigate(`/watch-spaces?search=${encodeURIComponent(query)}`);

    setSearchOpen(false);
    setMobileMenuOpen(false);
    setSearchQuery("");
  };

  const handleLogout = async () => {
    if (logoutLoading) return;

    try {
      setLogoutLoading(true);

      await logout();

      setMobileMenuOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Reusable avatar UI
  const renderAvatar = (size = "desktop") => {
    const dimensions = size === "mobile" ? "h-10 w-10" : "h-8 w-8";

    return (
      <div
        className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-red-500 to-red-800 text-white shadow-lg shadow-red-950/30`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${userName}'s profile`}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound size={size === "mobile" ? 20 : 17} />
        )}
      </div>
    );
  };

  return (
    <motion.header
      initial={{ y: -75, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/90 backdrop-blur-2xl"
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        {/* Brand and Desktop Navigation */}
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

        {/* Right Actions */}
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
                if (!searchOpen) {
                  setSearchOpen(true);
                }
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

          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label="Toggle search"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white sm:hidden"
          >
            {searchOpen ? <X size={19} /> : <Search size={19} />}
          </button>

          {user ? (
            <>
              {/* Notifications */}
              <button
                type="button"
                aria-label="Notifications"
                className="hidden rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white sm:block"
              >
                <Bell size={19} />
              </button>

              {/* Desktop Profile Dropdown */}
              <div className="group relative hidden sm:block">
                <button
                  type="button"
                  aria-label="Open profile menu"
                  className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/[0.06]"
                >
                  {renderAvatar()}

                  <span className="hidden max-w-28 truncate text-sm font-medium text-zinc-300 sm:block">
                    {userName}
                  </span>

                  <ChevronDown
                    size={15}
                    className="hidden text-zinc-400 sm:block"
                  />
                </button>

                <div className="invisible absolute right-0 top-full mt-2 w-52 translate-y-2 rounded-xl border border-white/10 bg-[#18181b] p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3">
                    {renderAvatar("mobile")}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {userName}
                      </p>

                      <p className="truncate text-xs text-zinc-500">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <UserRound size={16} />
                    My Profile
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-300 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogOut size={16} />
                    {logoutLoading ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-lg bg-[#e50914] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-[#f6121d] sm:block"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/10 md:hidden"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {/* Mobile Search Field */}
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

      {/* Mobile Navigation */}
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
                  onClick={closeMobileMenu}
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

              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-3 transition hover:bg-white/[0.05]"
                  >
                    {renderAvatar("mobile")}

                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white">
                        My Profile
                      </span>

                      <span className="block truncate text-xs text-zinc-500">
                        {userName}
                      </span>
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <LogOut size={16} />
                    {logoutLoading ? "Signing out..." : "Sign out"}
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="mt-2 block rounded-lg bg-[#e50914] px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#f6121d]"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
