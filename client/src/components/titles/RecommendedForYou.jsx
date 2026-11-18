import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import recommendationService from "../../services/recommendation.service.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function RecommendedForYou() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await recommendationService.getRecommendations(5);

      const recommendationList = Array.isArray(data)
        ? data
        : Array.isArray(data?.recommendations)
          ? data.recommendations
          : Array.isArray(data?.data?.recommendations)
            ? data.data.recommendations
            : [];

      setRecommendations(recommendationList);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load recommendations.",
      );

      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getThumbnailUrl = (title) => {
    if (!title?.thumbnailKey || !title?._id) {
      return null;
    }

    return `${API_BASE_URL}/titles/${title._id}/thumbnail`;
  };

  const formatDuration = (duration) => {
    if (!duration || Number.isNaN(Number(duration))) {
      return null;
    }

    const minutes = Math.floor(Number(duration) / 60);

    return `${minutes} min`;
  };

  const handleCreateWatchSpace = (titleId) => {
    if (!titleId) {
      return;
    }

    navigate(`/watch-spaces/create?titleId=${encodeURIComponent(titleId)}`);
  };

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Recommended for You</h2>

          <p className="mt-1 text-sm text-gray-400">
            Picks based on your watching preferences
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRecommendations}
          disabled={loading}
          className="rounded-md border border-gray-600 px-4 py-2 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <p className="py-6 text-gray-400">Loading recommendations...</p>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-4">
          <p className="text-red-300">{error}</p>

          <button
            type="button"
            onClick={fetchRecommendations}
            className="mt-3 text-sm font-semibold text-white underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="rounded-lg bg-[#222] p-6 text-gray-400">
          No recommendations available yet. Start watching titles to personalize
          your recommendations.
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {recommendations.map((title) => {
            const thumbnailUrl = getThumbnailUrl(title);

            return (
              <article
                key={title._id}
                className="overflow-hidden rounded-lg border border-gray-800 bg-[#222] transition hover:-translate-y-1 hover:border-gray-600"
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={title.name || "Movie thumbnail"}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-gray-700 via-gray-900 to-black p-4">
                    <span className="text-center text-lg font-bold text-white">
                      {title.name || "Untitled"}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-semibold text-white">
                    {title.name || "Untitled"}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                    {title.releaseYear && <span>{title.releaseYear}</span>}

                    {formatDuration(title.duration) && (
                      <span>{formatDuration(title.duration)}</span>
                    )}
                  </div>

                  {Array.isArray(title.genre) && title.genre.length > 0 && (
                    <p className="mt-2 text-xs text-gray-400">
                      {title.genre.join(" • ")}
                    </p>
                  )}

                  {title.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-gray-400">
                      {title.description}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCreateWatchSpace(title._id)}
                    disabled={!title._id}
                    className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create WatchSpace
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default RecommendedForYou;
