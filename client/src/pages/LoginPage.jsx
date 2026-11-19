import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import loginImage from "../assets/login.png";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-red-500/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-red-500/20";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/facebook`;
  };

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData);

      const redirectTo = location.state?.from;

      navigate(
        redirectTo?.pathname
          ? `${redirectTo.pathname}${redirectTo.search || ""}`
          : "/",
        { replace: true },
      );
    } catch (error) {
      setError(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
      {/* Background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(229,9,20,0.18),transparent_50%),radial-gradient(ellipse_at_85%_80%,rgba(127,29,29,0.22),transparent_45%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1280px] items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:px-12">
        {/* Left: brand + image */}
        <motion.section
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="hidden flex-col items-start lg:flex"
        >
          <Link to="/" className="mb-6 inline-block">
            <span className="text-4xl font-black tracking-[-1.5px] text-[#e50914]">
              NETFLIX
            </span>
            <span className="ml-2 text-[10px] font-bold tracking-[2px] text-zinc-400">
              AI WATCH SPACES
            </span>
          </Link>

          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            Welcome back to
            <span className="block bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
              movie night.
            </span>
          </h2>

          <p className="mt-4 max-w-md text-[15px] leading-7 text-zinc-400">
            Sign in to rejoin your WatchSpaces, catch up with friends, and let
            the AI co-pilot make every scene more fun.
          </p>

          <div className="relative mt-6 w-full max-w-lg">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/25 blur-3xl"
            />
            <motion.img
              src={loginImage}
              alt="Watch together illustration"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 mx-auto max-h-[340px] w-auto object-contain drop-shadow-[0_20px_40px_rgba(229,9,20,0.25)]"
              draggable={false}
            />
          </div>
        </motion.section>

        {/* Right: form card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto w-full max-w-md"
        >
          <div className="rounded-3xl border border-white/10 bg-[#111113]/80 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={itemVariants}>
                <Link to="/" className="mb-3 inline-block lg:hidden">
                  <span className="text-2xl font-black tracking-[-1.5px] text-[#e50914]">
                    NETFLIX
                  </span>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back
                </h1>
                <p className="mt-1.5 text-sm text-zinc-400">
                  Sign in to continue your entertainment experience.
                </p>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    role="alert"
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                  >
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Email */}
                <motion.div variants={itemVariants}>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-zinc-300"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                      className={inputClass}
                    />
                  </div>
                </motion.div>

                {/* Password */}
                <motion.div variants={itemVariants}>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-zinc-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      required
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </motion.div>

                {/* Submit */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={loading ? undefined : { scale: 1.02 }}
                    whileTap={loading ? undefined : { scale: 0.98 }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] to-red-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </motion.button>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div
                variants={itemVariants}
                className="my-6 flex items-center gap-4"
              >
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Or continue with
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </motion.div>

              {/* Social logins (icon style) */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center gap-4"
              >
                <motion.button
                  type="button"
                  onClick={handleGoogleLogin}
                  aria-label="Continue with Google"
                  title="Continue with Google"
                  whileHover={{ scale: 1.12, y: -3 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white shadow-lg shadow-black/30 transition hover:shadow-white/10"
                >
                  <svg viewBox="0 0 48 48" className="h-6 w-6">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      transform="translate(0 2)"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.97 46.98 31.82 46.98 24.55z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.12.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"
                      transform="translate(0 2)"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      transform="translate(0 -2)"
                    />
                  </svg>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleFacebookLogin}
                  aria-label="Continue with Facebook"
                  title="Continue with Facebook"
                  whileHover={{ scale: 1.12, y: -3 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#1877F2] text-white shadow-lg shadow-black/30 transition hover:shadow-[#1877F2]/30"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.49 0-1.953.93-1.953 1.885v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                </motion.button>
              </motion.div>

              {/* Register link */}
              <motion.div
                variants={itemVariants}
                className="mt-7 border-t border-white/10 pt-5 text-center"
              >
                <p className="text-sm text-zinc-400">
                  New to Netflix?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-white transition hover:text-red-400 hover:underline"
                  >
                    Sign up now
                  </Link>
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-zinc-600">
            © {new Date().getFullYear()} Netflix AI Watch Spaces. All rights
            reserved.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

export default LoginPage;
