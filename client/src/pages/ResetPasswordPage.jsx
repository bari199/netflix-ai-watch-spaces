import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/auth.service.js";

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await resetPassword({
        email,
        otp,
        password,
      });

      setSuccess(response.message || "Password reset successfully.");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please check your OTP and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="text-3xl font-bold tracking-tight text-red-600">
          NETFLIX
        </Link>

        <div className="mt-10 rounded-xl border border-white/10 bg-[#141414] p-7 shadow-2xl sm:p-9">
          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/15 text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="25"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold">Reset Your Password</h1>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Enter the 6-digit OTP sent to your email and create a new
              password.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
                disabled={loading}
                className="w-full rounded-lg border border-white/15 bg-[#222] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-red-600 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                6-Digit OTP
              </label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter your OTP"
                required
                disabled={loading}
                className="w-full rounded-lg border border-white/15 bg-[#222] px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none transition placeholder:text-sm placeholder:tracking-normal placeholder:text-gray-500 focus:border-red-600 disabled:opacity-60"
              />

              <p className="mt-2 text-xs text-gray-500">
                OTP is valid for 10 minutes.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                New Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                disabled={loading}
                className="w-full rounded-lg border border-white/15 bg-[#222] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-red-600 disabled:opacity-60"
              />
              <p className="mt-2 text-xs text-gray-500">
                Minimum 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Confirm New Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                disabled={loading}
                className="w-full rounded-lg border border-white/15 bg-[#222] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-red-600 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-7 border-t border-white/10 pt-5 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              <span className="mr-1">←</span>
              Back to Login
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Netflix AI Watch Spaces
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
