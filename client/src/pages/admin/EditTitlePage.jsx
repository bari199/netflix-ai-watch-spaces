import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";
import VariationTimelineEditor, {
  validateVariationTimeline,
} from "../../components/admin/VariationTimelineEditor.jsx";

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

  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTitle = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/titles/${titleId}`);
        const title = response.data?.title;

        if (!title) {
          throw new Error("Title data was not returned by the server.");
        }

        if (!isMounted) return;

        setFormData({
          name: title.name || "",
          description: title.description || "",
          genre: Array.isArray(title.genre) ? title.genre.join(", ") : "",
          releaseYear: title.releaseYear ?? "",
          duration: title.duration ?? "",
          isPublished: Boolean(title.isPublished),
        });

        setTimeline(Array.isArray(title.timeline) ? title.timeline : []);

        if (title.thumbnailKey) {
          setThumbnailPreview(
            `${import.meta.env.VITE_API_BASE_URL}/titles/${titleId}/thumbnail`,
          );
        } else {
          setThumbnailPreview("");
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load title.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTitle();

    return () => {
      isMounted = false;
    };
  }, [titleId]);

  useEffect(() => {
    return () => {
      if (thumbnailPreview.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleThumbnailChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Thumbnail must be JPEG, PNG or WEBP.");
      event.target.value = "";
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (!formData.name.trim()) {
      setError("Title name is required.");
      return;
    }

    if (!formData.duration || Number(formData.duration) <= 0) {
      setError("Enter a valid duration in seconds.");
      return;
    }

    const timelineError = validateVariationTimeline(
      timeline,
      formData.duration,
    );

    if (timelineError) {
      setError(timelineError);
      return;
    }

    try {
      setSaving(true);

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

      const normalizedTimeline = timeline.map((item) => {
        if (item?.eventType !== "variationPoint") return item;

        return {
          ...item,
          eventId: item.eventId,
          eventType: "variationPoint",
          startTime: Number(item.startTime),
          endTime: Number(item.endTime),
          description: String(item.description || "").trim(),
          variationId: String(item.variationId || "").trim(),
          options: (item.options || []).map((option) => ({
            ...option,
            id: String(option.id || "").trim(),
            label: String(option.label || "").trim(),
          })),
        };
      });

      const data = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined) {
          data.append(
            key,
            key === "genre" ? JSON.stringify(value) : String(value),
          );
        }
      });

      data.append("timeline", JSON.stringify(normalizedTimeline));

      if (thumbnail) {
        data.append("thumbnail", thumbnail);
      }

      await api.patch(`/titles/${titleId}`, data);

      navigate("/admin/titles", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update title.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-10 text-center text-gray-400">Loading title...</p>;
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none focus:border-red-500";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Title</h1>
        <p className="mt-2 text-sm text-gray-400">
          Update title information and configure interactive variation points.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-white/10 bg-[#1f1f1f] p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium">Title Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={inputClass}
          />
        </div>

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
            Select a new image only if you want to replace the current
            thumbnail.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Genres</label>
          <input
            type="text"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            placeholder="Action, Sci-Fi, Adventure"
            className={inputClass}
          />
        </div>

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
              min="1888"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Duration (seconds) *
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="1"
              required
              className={inputClass}
            />
          </div>
        </div>

        <VariationTimelineEditor
          timeline={timeline}
          onChange={setTimeline}
          duration={formData.duration}
        />

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

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/titles")}
            disabled={saving}
            className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTitlePage;
