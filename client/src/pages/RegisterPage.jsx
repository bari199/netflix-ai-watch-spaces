import { useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, ImagePlus, X } from "lucide-react";
import { registerUser } from "../services/auth.service.js";

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
    <div className="flex min-h-screen items-center justify-center bg-[#141414] px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-xl bg-[#222] p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-red-600">NETFLIX</h1>

        <h2 className="mb-6 text-2xl font-semibold">Create Account</h2>

        {error && (
          <p className="mb-4 rounded bg-red-900/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p className="mb-4 rounded bg-green-900/40 p-3 text-sm text-green-300">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-gray-600 bg-[#333]">
              {preview ? (
                <img
                  src={preview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={42} className="text-gray-400" />
              )}

              {preview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute right-0 top-0 rounded-full bg-red-600 p-1"
                  aria-label="Remove avatar"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm hover:border-red-500">
              <ImagePlus size={17} />
              {avatar ? "Change Avatar" : "Upload Avatar"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>

            <p className="text-xs text-gray-500">
              Optional · JPG, PNG or WebP · Max 5MB
            </p>
          </div>

          <input
            type="text"
            name="name"
            placeholder="Full name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded bg-[#333] px-4 py-3 outline-none focus:ring-2 focus:ring-red-600"
          />

          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full rounded bg-[#333] px-4 py-3 outline-none focus:ring-2 focus:ring-red-600"
          />

          <input
            type="password"
            name="password"
            placeholder="Password (minimum 8 characters)"
            value={formData.password}
            onChange={handleChange}
            minLength={8}
            required
            className="w-full rounded bg-[#333] px-4 py-3 outline-none focus:ring-2 focus:ring-red-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-red-600 py-3 font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
