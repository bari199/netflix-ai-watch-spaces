import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../services/auth.service.js";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail(email, token);
        setStatus("success");
        setMessage(response.message || "Email verified successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(
          error.response?.data?.message || "Email verification failed.",
        );
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#141414] px-4 text-white">
      <div className="w-full max-w-md rounded-xl bg-[#222] p-8 text-center">
        <h1 className="mb-6 text-3xl font-bold text-red-600">Netflix</h1>

        <h2 className="mb-4 text-2xl font-semibold">Email Verification</h2>

        <p
          className={
            status === "success"
              ? "text-green-400"
              : status === "error"
                ? "text-red-400"
                : "text-gray-300"
          }
        >
          {message}
        </p>

        {status !== "loading" && (
          <Link
            to="/login"
            className="mt-6 inline-block rounded bg-red-600 px-6 py-3 font-semibold hover:bg-red-700"
          >
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;
