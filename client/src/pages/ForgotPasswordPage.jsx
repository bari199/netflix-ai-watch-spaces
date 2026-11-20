import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../services/auth.service.js";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
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

    try {
      setLoading(true);

      const response = await forgotPassword(email);

      setSuccess(
        response.message || "OTP sent successfully. Please check your email.",
      );

      navigate("/reset-password", {
        state: { email: email.trim().toLowerCase() },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to send OTP. Please try again.",
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

        <div className="mt-10 rounded-xl border border-white/10 bg-[#141414] p-7 sm:p-9 shadow-2xl">
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
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold">Forgot Password?</h1>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Enter your registered email address. We'll send you a 6-digit OTP
              to reset your password.
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

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
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

export default ForgotPasswordPage;
