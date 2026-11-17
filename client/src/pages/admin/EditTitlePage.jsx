import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";
import VariationTimelineEditor from "../../components/admin/VariationTimelineEditor.jsx";
import SubtitleVariantEditor from "../../components/admin/SubtitleVariantEditor.jsx";
import {
  normalizeTimelineForSubmission,
  validateTimelineMetadata,
} from "../../utils/timelineMetadata.js";
import {
  prepareSubtitleVariantSubmission,
  validateSubtitleVariants,
} from "../../utils/subtitleVariants.js";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

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
  const [subtitleVariants, setSubtitleVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingVideoKey, setExistingVideoKey] = useState("");
  const [existingThumbnailKey, setExistingThumbnailKey] = useState("");
  const [video, setVideo] = useState(null);
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
        setExistingVideoKey(title.videoKey || "");
        setExistingThumbnailKey(title.thumbnailKey || "");
        setSubtitleVariants(
          (Array.isArray(title.subtitleVariants)
            ? title.subtitleVariants
            : []
          ).map((variant) => ({
            ...variant,
            draftId: `saved-${variant.variantId}`,
            file: null,
            eventId: variant.eventId || "",
            variationId: variant.variationId || "",
            optionId: variant.optionId || "",
          })),
        );

        if (title.thumbnailKey) {
          setThumbnailPreview(`${API_BASE_URL}/titles/${titleId}/thumbnail`);
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

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (
      file &&
      !["video/mp4", "video/webm", "video/quicktime"].includes(file.type)
    ) {
      setError("Video must be MP4, WEBM or MOV.");
      event.target.value = "";
      return;
    }

    setError("");
    setVideo(file);
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

    if (
      video &&
      !["video/mp4", "video/webm", "video/quicktime"].includes(video.type)
    ) {
      setError("Video must be MP4, WEBM or MOV.");
      return;
    }

    const timelineError = validateTimelineMetadata(timeline, formData.duration);

    if (timelineError) {
      setError(timelineError);
      return;
    }

    const subtitleError = validateSubtitleVariants(subtitleVariants, timeline);

    if (subtitleError) {
      setError(subtitleError);
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

      const normalizedTimeline = normalizeTimelineForSubmission(timeline);

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

      if (video) {
        data.append("video", video);
      }

      await api.patch(`/titles/${titleId}`, data);

      const subtitleSubmission =
        prepareSubtitleVariantSubmission(subtitleVariants);
      const subtitleData = new FormData();
      subtitleData.append(
        "variants",
        JSON.stringify(subtitleSubmission.variants),
      );
      subtitleSubmission.files.forEach((file) =>
        subtitleData.append("subtitleFiles", file),
      );
      await api.put(`/titles/${titleId}/subtitle-variants`, subtitleData);

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
          Update title information and timeline metadata.
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

        <div className="space-y-3">
          <label className="block text-sm font-medium">Current Video</label>
          {existingVideoKey ? (
            <>
              <p className="text-xs text-gray-400">
                Stored as: {existingVideoKey.split("/").pop()}
              </p>
              <video
                controls
                preload="metadata"
                src={`${API_BASE_URL}/titles/${titleId}/video`}
                className="aspect-video w-full rounded-lg border border-white/10 bg-black"
              >
                Your browser does not support HTML5 video.
              </video>
            </>
          ) : (
            <p className="text-sm text-yellow-300">
              No existing video reference was returned for this title.
            </p>
          )}

          <label className="block text-sm font-medium">Replace Video</label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideoChange}
            className="w-full rounded-lg border border-white/10 bg-[#141414] p-3 text-sm"
          />
          <p className="text-xs text-gray-500">
            Optional. Leave empty to keep the current video. Supported formats:
            MP4, WEBM and MOV.
          </p>
          {video && (
            <p className="text-sm text-green-400">
              Replacement selected: {video.name}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Existing Thumbnail
          </label>

          {existingThumbnailKey || thumbnailPreview ? (
            <div className="mb-4">
              <p className="mb-2 text-xs text-gray-400">
                Stored as: {existingThumbnailKey.split("/").pop()}
              </p>
              <img
                src={thumbnailPreview}
                alt="Current title thumbnail"
                className="aspect-video w-full max-w-md rounded-lg border border-white/10 object-cover"
              />
            </div>
          ) : (
            <p className="mb-4 text-sm text-gray-500">
              No thumbnail is currently set.
            </p>
          )}

          <label className="mb-2 block text-sm font-medium">
            Replace Thumbnail
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleThumbnailChange}
            className="w-full rounded-lg border border-white/10 bg-[#141414] p-3 text-sm"
          />

          <p className="mt-2 text-xs text-gray-500">
            Optional. Leave empty to keep the current thumbnail.
          </p>
          {thumbnail && (
            <p className="mt-2 text-sm text-green-400">
              Replacement selected: {thumbnail.name}
            </p>
          )}
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

        <SubtitleVariantEditor
          variants={subtitleVariants}
          onChange={setSubtitleVariants}
          timeline={timeline}
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
