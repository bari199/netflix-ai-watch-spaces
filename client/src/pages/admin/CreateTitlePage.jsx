import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const STEPS = [
  { number: 1, title: "Basic Info", description: "Title details" },
  { number: 2, title: "Media", description: "Video and thumbnail" },
  { number: 3, title: "Timeline", description: "Variations and subtitles" },
  { number: 4, title: "Review", description: "Save or publish" },
];

const CreateTitlePage = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    genre: "",
    releaseYear: "",
    duration: "",
  });

  const [timeline, setTimeline] = useState([]);
  const [subtitleVariants, setSubtitleVariants] = useState([]);
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdTitleId, setCreatedTitleId] = useState("");

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#252525] px-4 py-3 text-white outline-none focus:border-red-600";

  useEffect(() => {
    if (!thumbnail) {
      setThumbnailPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(thumbnail);
    setThumbnailPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [thumbnail]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const uploadSubtitleVariants = async (targetTitleId) => {
    const submission = prepareSubtitleVariantSubmission(subtitleVariants);
    const subtitleData = new FormData();

    subtitleData.append("variants", JSON.stringify(submission.variants));

    submission.files.forEach((file) => {
      subtitleData.append("subtitleFiles", file);
    });

    await api.put(`/titles/${targetTitleId}/subtitle-variants`, subtitleData);
  };

  const handleSubtitleRetry = async () => {
    if (!createdTitleId || loading) return;

    try {
      setLoading(true);
      setError("");

      await uploadSubtitleVariants(createdTitleId);

      navigate("/admin/titles", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Title was created, but subtitle upload failed. Retry the subtitle upload.",
      );
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step) => {
    setError("");

    if (step === 1) {
      if (!formData.name.trim()) {
        setError("Please enter the movie name.");
        return false;
      }

      if (
        !formData.duration ||
        !Number.isFinite(Number(formData.duration)) ||
        Number(formData.duration) <= 0
      ) {
        setError("Please enter a valid duration in seconds.");
        return false;
      }

      if (
        formData.releaseYear &&
        (Number(formData.releaseYear) < 1888 ||
          !Number.isInteger(Number(formData.releaseYear)))
      ) {
        setError("Please enter a valid release year.");
        return false;
      }
    }

    if (step === 2) {
      if (!video) {
        setError("Please select a video file.");
        return false;
      }

      if (
        thumbnail &&
        !["image/jpeg", "image/png", "image/webp"].includes(thumbnail.type)
      ) {
        setError("Thumbnail must be JPEG, PNG or WEBP.");
        return false;
      }
    }

    if (step === 3) {
      const timelineError = validateTimelineMetadata(
        timeline,
        formData.duration,
      );

      if (timelineError) {
        setError(timelineError);
        return false;
      }

      const subtitleError = validateSubtitleVariants(
        subtitleVariants,
        timeline,
      );

      if (subtitleError) {
        setError(subtitleError);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    setCurrentStep((previous) => Math.min(previous + 1, 4));
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((previous) => Math.max(previous - 1, 1));
  };

  const handleCreateTitle = async (shouldPublish) => {
    if (loading || createdTitleId) return;

    for (let step = 1; step <= 3; step += 1) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    let newlyCreatedTitleId = "";

    try {
      setLoading(true);
      setError("");

      const data = new FormData();

      data.append("name", formData.name.trim());
      data.append("description", formData.description.trim());

      data.append(
        "genre",
        JSON.stringify(
          formData.genre
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );

      data.append("duration", String(Number(formData.duration)));

      if (formData.releaseYear) {
        data.append("releaseYear", String(Number(formData.releaseYear)));
      }

      data.append("isPublished", String(shouldPublish));

      const normalizedTimeline = normalizeTimelineForSubmission(timeline);

      data.append("timeline", JSON.stringify(normalizedTimeline));
      data.append("video", video);

      if (thumbnail) {
        data.append("thumbnail", thumbnail);
      }

      const response = await api.post(
        shouldPublish ? "/titles" : "/titles/drafts",
        data,
      );

      newlyCreatedTitleId = response.data?.title?._id;

      if (!newlyCreatedTitleId) {
        throw new Error("Title was created, but its ID was not returned.");
      }

      if (subtitleVariants.length > 0) {
        setCreatedTitleId(newlyCreatedTitleId);
        await uploadSubtitleVariants(newlyCreatedTitleId);
      }

      navigate("/admin/titles", { replace: true });
    } catch (err) {
      if (newlyCreatedTitleId) {
        setCreatedTitleId(newlyCreatedTitleId);
        setError(
          err.response?.data?.message ||
            "Title was created, but subtitle upload failed. Retry the subtitle upload.",
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to create title.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const genres = formData.genre
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/titles"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to Titles
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Create New Title</h1>

        <p className="mt-2 text-sm text-gray-400">
          Follow the steps to add a new movie or series.
        </p>
      </div>

      {/* Step Progress */}
      <div className="rounded-xl border border-white/10 bg-[#1f1f1f] p-5">
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => {
                  if (step.number < currentStep) {
                    setError("");
                    setCurrentStep(step.number);
                  }
                }}
                disabled={step.number >= currentStep || loading}
                className="min-w-0 text-left disabled:cursor-default"
              >
                <div
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    isCompleted
                      ? "bg-green-600 text-white"
                      : isActive
                        ? "bg-red-600 text-white"
                        : "bg-white/10 text-gray-400"
                  }`}
                >
                  {isCompleted ? "✓" : step.number}
                </div>

                <p
                  className={`text-xs font-semibold sm:text-sm ${
                    isActive || isCompleted ? "text-white" : "text-gray-500"
                  }`}
                >
                  {step.title}
                </p>

                <p className="mt-1 hidden text-xs text-gray-500 sm:block">
                  {step.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        <p className="mt-3 text-right text-xs text-gray-500">
          Step {currentStep} of 4
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <div className="space-y-6 rounded-xl border border-white/10 bg-[#1f1f1f] p-5 sm:p-6">
        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Basic Information</h2>
              <p className="mt-1 text-sm text-gray-400">
                Enter the basic details of your movie or series.
              </p>
            </div>

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
                rows={5}
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
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MEDIA */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Media Upload</h2>
              <p className="mt-1 text-sm text-gray-400">
                Upload the title thumbnail and video file.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Thumbnail Image (JPEG, PNG, WEBP)
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setThumbnail(event.target.files?.[0] || null)
                }
                className="w-full rounded-lg border border-white/10 bg-[#252525] p-3 text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-white"
              />

              {thumbnail && (
                <p className="mt-2 text-sm text-green-400">
                  Selected: {thumbnail.name}
                </p>
              )}

              {thumbnailPreview && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-gray-400">
                    Thumbnail Preview
                  </p>
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

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Video File (MP4, WEBM, MOV) *
              </label>

              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(event) => setVideo(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-white/10 bg-[#252525] p-3 text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-white"
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
          </div>
        )}

        {/* STEP 3: TIMELINE & SUBTITLES */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold">Timeline & Subtitles</h2>
              <p className="mt-1 text-sm text-gray-400">
                Configure video variations and subtitle languages.
              </p>
            </div>

            <VariationTimelineEditor
              timeline={timeline}
              onChange={setTimeline}
              duration={formData.duration}
            />

            <div className="border-t border-white/10 pt-6">
              <SubtitleVariantEditor
                variants={subtitleVariants}
                onChange={setSubtitleVariants}
                timeline={timeline}
              />
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Review Your Title</h2>
              <p className="mt-1 text-sm text-gray-400">
                Review the information before saving or publishing.
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-white/10 bg-[#252525] p-4">
              <div>
                <p className="text-xs text-gray-500">Movie Name</p>
                <p className="mt-1 font-semibold text-white">
                  {formData.name || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">
                  {formData.description || "No description"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Genres</p>
                  <p className="mt-1 text-sm text-white">
                    {genres.length ? genres.join(", ") : "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Release Year</p>
                  <p className="mt-1 text-sm text-white">
                    {formData.releaseYear || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="mt-1 text-sm text-white">
                    {formData.duration
                      ? `${formData.duration} seconds`
                      : "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Timeline Entries</p>
                  <p className="mt-1 text-sm text-white">{timeline.length}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Subtitle Variants</p>
                  <p className="mt-1 text-sm text-white">
                    {subtitleVariants.length}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs text-gray-500">Thumbnail</p>
                <p className="mt-1 text-sm text-white">
                  {thumbnail?.name || "Not selected"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Video File</p>
                <p className="mt-1 break-all text-sm text-white">
                  {video?.name || "Not selected"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-sm font-medium text-yellow-400">
                Before you continue
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                Save as Draft keeps the title unpublished. Publish makes it
                available according to your application's publication rules.
                Both actions upload the selected video.
              </p>
            </div>
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50 sm:w-auto"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {currentStep < 4 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Continue →
              </button>
            )}

            {currentStep === 4 && (
              <>
                <button
                  type="button"
                  onClick={() => handleCreateTitle(false)}
                  disabled={loading || Boolean(createdTitleId)}
                  className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Uploading..." : "Save as Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateTitle(true)}
                  disabled={loading || Boolean(createdTitleId)}
                  className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Uploading..." : "Publish Title"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* SUBTITLE RETRY */}
        {createdTitleId && (
          <button
            type="button"
            onClick={handleSubtitleRetry}
            disabled={loading}
            className="w-full rounded-lg border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Uploading subtitles..." : "Retry subtitle upload"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateTitlePage;
