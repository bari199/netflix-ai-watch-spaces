import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const CreateTitlePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    genre: "",
    releaseYear: "",
    duration: "",
    isPublished: false,
  });

  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate and clean up thumbnail preview URL
  useEffect(() => {
    if (!thumbnail) {
      setThumbnailPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(thumbnail);
    setThumbnailPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [thumbnail]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!video) {
      setError("Please select a video file.");
      return;
    }

    if (
      thumbnail &&
      !["image/jpeg", "image/png", "image/webp"].includes(thumbnail.type)
    ) {
      setError("Thumbnail must be JPEG, PNG or WEBP.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = new FormData();

      data.append("name", formData.name);
      data.append("description", formData.description);

      data.append(
        "genre",
        JSON.stringify(
          formData.genre
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );

      data.append("duration", formData.duration);

      if (formData.releaseYear) {
        data.append("releaseYear", formData.releaseYear);
      }

      data.append("isPublished", String(formData.isPublished));
      data.append("timeline", JSON.stringify([]));
      data.append("video", video);

      // Thumbnail is optional
      if (thumbnail) {
        data.append("thumbnail", thumbnail);
      }

      await api.post("/titles", data);

      navigate("/admin/titles", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create title.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#252525] px-4 py-3 text-white outline-none focus:border-red-600";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/admin/titles"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to Titles
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Create New Title</h1>

        <p className="mt-2 text-sm text-gray-400">
          Add movie information, thumbnail and video.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-white/10 bg-[#1f1f1f] p-6"
      >
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Movie Name *
          </label>

          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={inputClass}
            placeholder="Enter movie name"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Description
          </label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={inputClass}
            rows={4}
            placeholder="Enter movie description"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Genres (comma separated)
          </label>

          <input
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            className={inputClass}
            placeholder="Action, Drama, Thriller"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Release Year
            </label>

            <input
              type="number"
              name="releaseYear"
              value={formData.releaseYear}
              onChange={handleChange}
              className={inputClass}
              placeholder="2026"
              min="1888"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Duration (seconds) *
            </label>

            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className={inputClass}
              placeholder="7200"
              min="1"
              required
            />
          </div>
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Thumbnail Image (JPEG, PNG, WEBP)
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-white/10 bg-[#252525] p-3 text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-white"
          />

          {thumbnail && (
            <p className="mt-2 text-sm text-green-400">
              Selected: {thumbnail.name}
            </p>
          )}

          {thumbnailPreview && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-400">Thumbnail Preview</p>

              <img
                src={thumbnailPreview}
                alt="Selected thumbnail preview"
                className="aspect-video w-full max-w-md rounded-lg border border-white/10 object-cover"
              />
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Optional. Supported formats: JPG, PNG and WEBP.
          </p>
        </div>

        {/* Video Upload */}
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Video File (MP4, WEBM, MOV) *
          </label>

          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setVideo(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-white/10 bg-[#252525] p-3 text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-white"
            required
          />

          {video && (
            <p className="mt-2 text-sm text-green-400">
              Selected: {video.name}
            </p>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Maximum upload size: 500 MB
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            name="isPublished"
            checked={formData.isPublished}
            onChange={handleChange}
            className="h-4 w-4 accent-red-600"
          />
          Publish immediately
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Create Title"}
        </button>
      </form>
    </div>
  );
};

export default CreateTitlePage;
