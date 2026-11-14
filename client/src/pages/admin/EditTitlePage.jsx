import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";

const EditTitlePage = () => {
  const { titleId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    genre: "",
    releaseYear: "",
    duration: "",
    isPublished: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Thumbnail states
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  // Fetch existing title
  useEffect(() => {
    const fetchTitle = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/titles/${titleId}`);
        const title = response.data.title;

        // Load existing thumbnail
        if (title.thumbnailKey) {
          setThumbnailPreview(
            `${import.meta.env.VITE_API_BASE_URL}/titles/${titleId}/thumbnail`,
          );
        }

        setFormData({
          name: title.name || "",
          description: title.description || "",
          genre: title.genre?.join(", ") || "",
          releaseYear: title.releaseYear || "",
          duration: title.duration || "",
          isPublished: Boolean(title.isPublished),
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load title.");
      } finally {
        setLoading(false);
      }
    };

    fetchTitle();
  }, [titleId]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle thumbnail selection
  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Thumbnail must be JPEG, PNG or WEBP.");
      e.target.value = "";
      return;
    }

    setError("");
    setThumbnail(file);

    const previewUrl = URL.createObjectURL(file);

    setThumbnailPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return previewUrl;
    });
  };

  // Submit updated title
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        genre: formData.genre
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        duration: Number(formData.duration),
        releaseYear: formData.releaseYear
          ? Number(formData.releaseYear)
          : undefined,
        isPublished: formData.isPublished,
      };

      // Create FormData
      const data = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined) {
          data.append(
            key,
            key === "genre" ? JSON.stringify(value) : String(value),
          );
        }
      });

      // Append new thumbnail if selected
      if (thumbnail) {
        data.append("thumbnail", thumbnail);
      }

      // Update title
      await api.patch(`/titles/${titleId}`, data);

      // Navigate after successful update
      navigate("/admin/titles");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update title.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-10 text-center text-gray-400">Loading title...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Title</h1>

        <p className="mt-2 text-sm text-gray-400">
          Update your movie or video information.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-white/10 bg-[#1f1f1f] p-6"
      >
        {/* Title Name */}
        <div>
          <label className="mb-2 block text-sm font-medium">Title Name</label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-white/10 bg-[#141414] px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full rounded-lg border border-white/10 bg-[#141414] px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        {/* Thumbnail Preview and Replace */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Thumbnail Image
          </label>

          {thumbnailPreview && (
            <img
              src={thumbnailPreview}
              alt="Title thumbnail"
              className="mb-4 aspect-video w-full max-w-md rounded-lg border border-white/10 object-cover"
            />
          )}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleThumbnailChange}
            className="w-full rounded-lg border border-white/10 bg-[#141414] p-3 text-sm"
          />

          <p className="mt-2 text-xs text-gray-500">
            Select a new image to replace the existing thumbnail.
          </p>
        </div>

        {/* Genres */}
        <div>
          <label className="mb-2 block text-sm font-medium">Genres</label>

          <input
            type="text"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            placeholder="Action, Sci-Fi, Adventure"
            className="w-full rounded-lg border border-white/10 bg-[#141414] px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        {/* Release Year and Duration */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Release Year
            </label>

            <input
              type="number"
              name="releaseYear"
              value={formData.releaseYear}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-[#141414] px-4 py-3 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Duration (seconds)
            </label>

            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="1"
              required
              className="w-full rounded-lg border border-white/10 bg-[#141414] px-4 py-3 outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Publish Status */}
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="isPublished"
            checked={formData.isPublished}
            onChange={handleChange}
            className="h-4 w-4 accent-red-600"
          />
          Publish this title
        </label>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/titles")}
            className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTitlePage;
