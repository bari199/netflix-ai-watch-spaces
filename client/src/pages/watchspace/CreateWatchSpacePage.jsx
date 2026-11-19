import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { createWatchSpace } from "../../services/watchSpace.service.js";
import Navbar from "../../components/layout/Navbar.jsx";
import createWatchImage from "../../assets/createwatch.png";

// Shared page shell (defined outside the page so it never remounts on typing)
const PageShell = ({ children }) => (
  <div className="min-h-screen bg-[#09090b] text-white">
    <Navbar />
    <main className="flex justify-center px-4 py-8 sm:px-6 sm:py-10">
      {children}
    </main>
  </div>
);

const CreateWatchSpacePage = () => {
  const { user } = useAuth();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedTitleId = searchParams.get("titleId");

  const [titles, setTitles] = useState([]);
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    titleId: "",
    isPrivate: false,
    maxParticipants: 25,
    aiVerbosity: "normal",
    triviaEnabled: true,
    votingEnabled: false,
    scheduledAt: "",
  });

  // Only authenticated users can create WatchSpaces
  const canCreateRoom = Boolean(user);

  // Fetch available titles
  useEffect(() => {
    const fetchTitles = async () => {
      try {
        setLoadingTitles(true);
        setError("");

        const response = await api.get("/titles");
        const availableTitles = response.data.titles || [];

        setTitles(availableTitles);

        if (availableTitles.length > 0) {
          const isRequestedTitleAvailable = availableTitles.some(
            (title) => String(title._id) === String(requestedTitleId),
          );

          setFormData((prev) => ({
            ...prev,
            titleId: isRequestedTitleAvailable
              ? requestedTitleId
              : availableTitles[0]._id,
          }));
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load titles.");
      } finally {
        setLoadingTitles(false);
      }
    };

    fetchTitles();
  }, [requestedTitleId]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "maxParticipants"
            ? Number(value)
            : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canCreateRoom) {
      setError("You do not have permission to create a WatchSpace.");
      return;
    }

    if (!formData.titleId) {
      setError("Please select a movie or title.");
      return;
    }

    if (
      !Number.isInteger(formData.maxParticipants) ||
      formData.maxParticipants < 2 ||
      formData.maxParticipants > 50
    ) {
      setError("Max participants must be between 2 and 50.");
      return;
    }

    // Convert local date-time to ISO string
    let scheduledAt = null;

    if (formData.scheduledAt) {
      const selectedDate = new Date(formData.scheduledAt);

      if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
        setError("Please select a valid future date and time.");
        return;
      }

      scheduledAt = selectedDate.toISOString();
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        ...formData,
        scheduledAt,
      };

      const response = await createWatchSpace(payload);

      const watchSpaceId = response.watchSpace?._id || response.watchSpaceId;

      if (!watchSpaceId) {
        throw new Error("WatchSpace created, but its ID was not returned.");
      }

      navigate(`/watch-spaces/${watchSpaceId}`, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create WatchSpace.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full min-w-0 rounded-lg border border-white/10 bg-[#111318] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-500 hover:border-white/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/20";

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-300";

  const toggleClass =
    "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#111318] p-3 transition hover:border-white/20";

  if (!canCreateRoom) {
    return (
      <PageShell>
        <section className="h-fit w-full max-w-md rounded-2xl border border-white/10 bg-[#15171c] p-8 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-xl text-red-400">
            !
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
            Restricted access
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Access Denied
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Only Host and Admin accounts can create a WatchSpace.
          </p>
          <Link
            to="/watch-spaces"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Back to WatchSpaces
          </Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="w-full max-w-2xl">
        <Link
          to="/watch-spaces"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to WatchSpaces
        </Link>

        {/* Medium card */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#15171c] shadow-2xl shadow-black/40">
          {/* Image banner */}
          <div className="relative h-40 w-full sm:h-44">
            <img
              src={createWatchImage}
              alt="Create WatchSpace"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#15171c] via-[#15171c]/60 to-black/20" />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-4 sm:px-6">
              <p className="mb-1 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                Your private cinema
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Create a WatchSpace
              </h1>
              <p className="mt-1 text-xs leading-5 text-gray-300 sm:text-sm">
                Choose your film, set the room, and watch together.
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5 sm:p-6">
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
              >
                <span className="font-bold">!</span>
                <span>{error}</span>
              </div>
            )}

            {loadingTitles ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-red-500" />
                <p className="text-sm font-medium text-gray-300">
                  Loading movies...
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Getting your available titles
                </p>
              </div>
            ) : titles.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-2xl">
                  🎬
                </div>
                <h2 className="text-lg font-semibold">No Titles Available</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-400">
                  Add a movie or title before creating a WatchSpace.
                </p>
                <Link
                  to="/watch-spaces"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold transition hover:bg-red-500"
                >
                  Back to WatchSpaces
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Movie */}
                <div>
                  <label htmlFor="titleId" className={labelClass}>
                    Movie / Title <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="titleId"
                    name="titleId"
                    value={formData.titleId}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  >
                    <option value="" disabled>
                      Select a movie
                    </option>
                    {titles.map((title) => (
                      <option key={title._id} value={title._id}>
                        {title.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room config */}
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label htmlFor="scheduledAt" className={labelClass}>
                      Schedule date &amp; time
                    </label>
                    <input
                      id="scheduledAt"
                      type="datetime-local"
                      name="scheduledAt"
                      value={formData.scheduledAt}
                      onChange={handleChange}
                      min={new Date(Date.now() + 60000)
                        .toISOString()
                        .slice(0, 16)}
                      className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Leave empty to start immediately.
                    </p>
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="maxParticipants" className={labelClass}>
                      Maximum participants
                    </label>
                    <input
                      id="maxParticipants"
                      type="number"
                      name="maxParticipants"
                      value={formData.maxParticipants}
                      onChange={handleChange}
                      min="2"
                      max="50"
                      className={inputClass}
                      required
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Capacity: 2–50 participants.
                    </p>
                  </div>

                  <div className="min-w-0 sm:col-span-2">
                    <label htmlFor="aiVerbosity" className={labelClass}>
                      AI Co-Pilot response style
                    </label>
                    <select
                      id="aiVerbosity"
                      name="aiVerbosity"
                      value={formData.aiVerbosity}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="minimal">Minimal — concise answers</option>
                      <option value="normal">
                        Normal — balanced responses
                      </option>
                      <option value="chatty">
                        Chatty — more conversational
                      </option>
                    </select>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <p className={labelClass}>Room features</p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <label className={toggleClass}>
                      <input
                        type="checkbox"
                        name="isPrivate"
                        checked={formData.isPrivate}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-200">
                          Private room
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">
                          Invite code required.
                        </span>
                      </span>
                    </label>

                    <label className={toggleClass}>
                      <input
                        type="checkbox"
                        name="triviaEnabled"
                        checked={formData.triviaEnabled}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-200">
                          Trivia
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">
                          Trivia at marked moments.
                        </span>
                      </span>
                    </label>

                    <label className={toggleClass}>
                      <input
                        type="checkbox"
                        name="votingEnabled"
                        checked={formData.votingEnabled}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-200">
                          Voting
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">
                          Vote on variations.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !formData.titleId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[#15171c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating WatchSpace...
                    </>
                  ) : (
                    "Create WatchSpace"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default CreateWatchSpacePage;
