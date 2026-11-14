import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../api/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { createWatchSpace } from "../../services/watchSpace.service.js";

const CreateWatchSpacePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [titles, setTitles] = useState([]);
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    titleId: "",
    isPrivate: false,
    maxParticipants: 25,
    aiVerbosity: "normal",
    votingEnabled: false,
  });

  // Only Host and Admin accounts can create WatchSpaces
  const canCreateRoom = ["host", "admin"].includes(user?.role);

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
          setFormData((prev) => ({
            ...prev,
            titleId: availableTitles[0]._id,
          }));
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load titles.");
      } finally {
        setLoadingTitles(false);
      }
    };

    fetchTitles();
  }, []);

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

    try {
      setSubmitting(true);
      setError("");

      const response = await createWatchSpace(formData);

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
    "w-full rounded-lg border border-white/10 bg-[#252525] px-4 py-3 text-white outline-none focus:border-red-600";

  if (!canCreateRoom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414] p-6 text-white">
        <div className="max-w-md rounded-xl border border-white/10 bg-[#181818] p-8 text-center">
          <h2 className="text-xl font-bold">Access Denied</h2>

          <p className="mt-3 text-sm text-gray-400">
            Only Host and Admin accounts can create a WatchSpace.
          </p>

          <Link
            to="/watch-spaces"
            className="mt-6 inline-block rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-700"
          >
            Back to WatchSpaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/watch-spaces"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← Back to WatchSpaces
          </Link>

          <h1 className="mt-5 text-3xl font-bold">Create WatchSpace</h1>

          <p className="mt-2 text-sm text-gray-400">
            Choose a movie and configure your watch room.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading Titles */}
        {loadingTitles ? (
          <div className="rounded-xl border border-white/10 bg-[#181818] p-10 text-center text-gray-400">
            Loading titles...
          </div>
        ) : titles.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#181818] p-10 text-center">
            <h2 className="text-lg font-semibold">No Titles Available</h2>

            <p className="mt-2 text-sm text-gray-400">
              Add a movie or title before creating a WatchSpace.
            </p>

            <Link
              to="/watch-spaces"
              className="mt-5 inline-block rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-700"
            >
              Back to WatchSpaces
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-xl border border-white/10 bg-[#181818] p-6"
          >
            {/* Movie Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Select Movie / Title *
              </label>

              <select
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

            {/* Maximum Participants */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Maximum Participants
              </label>

              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="2"
                max="50"
                className={inputClass}
                required
              />

              <p className="mt-2 text-xs text-gray-500">
                Minimum 2 and maximum 50 participants.
              </p>
            </div>

            {/* AI Verbosity */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                AI Verbosity
              </label>

              <select
                name="aiVerbosity"
                value={formData.aiVerbosity}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="minimal">Minimal</option>
                <option value="normal">Normal</option>
                <option value="chatty">Chatty</option>
              </select>
            </div>

            {/* Privacy */}
            <div className="rounded-lg border border-white/10 bg-[#202020] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="isPrivate"
                  checked={formData.isPrivate}
                  onChange={handleChange}
                  className="h-4 w-4 accent-red-600"
                />

                <span className="text-sm font-medium text-gray-200">
                  Make this WatchSpace private
                </span>
              </label>

              <p className="mt-2 pl-7 text-xs text-gray-500">
                Private WatchSpaces require an invite code to join.
              </p>
            </div>

            {/* Voting */}
            <div className="rounded-lg border border-white/10 bg-[#202020] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="votingEnabled"
                  checked={formData.votingEnabled}
                  onChange={handleChange}
                  className="h-4 w-4 accent-red-600"
                />

                <span className="text-sm font-medium text-gray-200">
                  Enable variation voting
                </span>
              </label>

              <p className="mt-2 pl-7 text-xs text-gray-500">
                Allow participants to vote on available variations.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !formData.titleId}
              className="w-full rounded-lg bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating WatchSpace..." : "Create WatchSpace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateWatchSpacePage;
