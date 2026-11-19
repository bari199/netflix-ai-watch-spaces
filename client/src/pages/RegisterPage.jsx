import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  UserRound,
  ImagePlus,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { registerUser } from "../services/auth.service.js";
import registerImage from "../assets/register.png";

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

function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI-only state (does not affect business logic)
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setAvatar(file);

    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const removeAvatar = () => {
    if (preview) URL.revokeObjectURL(preview);

    setAvatar(null);
    setPreview("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await registerUser({
        ...formData,
        avatar,
      });

      setSuccess(response.message);

      setFormData({
        name: "",
        email: "",
        password: "",
      });

      removeAvatar();
      event.target.reset();
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
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
            Watch together.
            <span className="block bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
              Feel every moment.
            </span>
          </h2>

          <p className="mt-4 max-w-md text-[15px] leading-7 text-zinc-400">
            Create your account to host private movie nights, join live rooms,
            and enjoy an AI co-pilot that makes every watch party smarter.
          </p>

          <div className="relative mt-6 w-full max-w-lg">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/25 blur-3xl"
            />
            <motion.img
              src={registerImage}
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
                  Create Account
                </h1>
                <p className="mt-1.5 text-sm text-zinc-400">
                  Join in seconds and start your first WatchSpace.
                </p>
              </motion.div>

              {/* Alerts */}
              <AnimatePresence mode="popLayout">
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

                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-5 flex items-start gap-2.5 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300"
                  >
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Avatar */}
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
                >
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-[#1c1c20]">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound size={30} className="text-zinc-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium transition hover:border-red-500/60 hover:bg-red-500/10">
                        <ImagePlus size={15} />
                        {avatar ? "Change Avatar" : "Upload Avatar"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>

                      <AnimatePresence>
                        {preview && (
                          <motion.button
                            type="button"
                            onClick={removeAvatar}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                            aria-label="Remove avatar"
                          >
                            <X size={14} />
                            Remove
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Optional · JPG, PNG or WebP · Max 5MB
                    </p>
                  </div>
                </motion.div>

                {/* Name */}
                <motion.div variants={itemVariants} className="relative">
                  <UserRound
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    name="name"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </motion.div>

                {/* Email */}
                <motion.div variants={itemVariants} className="relative">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </motion.div>

                {/* Password */}
                <motion.div variants={itemVariants} className="relative">
                  <Lock
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password (minimum 8 characters)"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={8}
                    required
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
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
                        Creating account...
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </motion.button>
                </motion.div>
              </form>

              <motion.p
                variants={itemVariants}
                className="mt-6 text-center text-sm text-zinc-400"
              >
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-white transition hover:text-red-400 hover:underline"
                >
                  Sign in
                </Link>
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default RegisterPage;
