import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

const AdminLoginPage = () => {
  const { adminLogin, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await adminLogin({ email, password });

      if (response.user?.role !== "admin") {
        setError("Unauthorized account.");
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Admin login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-[-2px] text-[#e50914]">
            NETFLIX
          </h1>

          <p className="mt-2 text-xs font-bold tracking-[3px] text-zinc-500">
            ADMIN CONSOLE
          </p>

          <h2 className="mt-8 text-2xl font-semibold">Administrator Login</h2>

          <p className="mt-2 text-sm text-zinc-400">
            Sign in to manage the platform.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Email address
            </label>

            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-4">
              <Mail size={18} className="text-zinc-500" />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email"
                required
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">Password</label>

            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-4">
              <LockKeyhole size={18} className="text-zinc-500" />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                required
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-lg bg-[#e50914] font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign In as Admin"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Restricted access · Authorized administrators only
        </p>
      </div>
    </main>
  );
};

export default AdminLoginPage;
