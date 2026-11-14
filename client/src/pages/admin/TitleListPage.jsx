import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const TitleListPage = () => {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchTitles = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/titles");
        setTitles(response.data.titles || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load titles.");
      } finally {
        setLoading(false);
      }
    };

    fetchTitles();
  }, []);

  const handleDelete = async (titleId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this title? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setDeletingId(titleId);
      setError("");

      await api.delete(`/titles/${titleId}`);

      setTitles((prevTitles) =>
        prevTitles.filter((title) => title._id !== titleId),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete title.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Manage Titles</h1>

        <p className="mt-1 text-sm text-gray-400">
          Manage your movies and streaming content.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center text-gray-400">
          Loading titles...
        </div>
      ) : titles.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-white/10 bg-[#181818] p-8 text-center">
          <p className="text-gray-400">No titles found.</p>
        </div>
      ) : (
        /* Titles Table */
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#181818]">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-white/10 bg-[#202020] text-gray-400">
              <tr>
                <th className="px-5 py-4">Thumbnail</th>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Genre</th>
                <th className="px-5 py-4">Duration</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {titles.map((title) => (
                <tr
                  key={title._id}
                  className="transition hover:bg-white/[0.03]"
                >
                  {/* Thumbnail */}
                  <td className="px-5 py-4">
                    {title.thumbnailKey ? (
                      <img
                        src={`${API_BASE_URL}/titles/${title._id}/thumbnail`}
                        alt={title.name}
                        className="h-16 w-28 rounded-md border border-white/10 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error(
                            "Thumbnail loading failed:",
                            e.currentTarget.src,
                          );
                        }}
                      />
                    ) : (
                      <div className="flex h-16 w-28 items-center justify-center rounded-md bg-[#252525] text-xs text-gray-500">
                        No Image
                      </div>
                    )}
                  </td>

                  {/* Title */}
                  <td className="px-5 py-4 font-medium text-white">
                    {title.name}
                  </td>

                  {/* Genre */}
                  <td className="px-5 py-4 text-gray-400">
                    {title.genre?.length ? title.genre.join(", ") : "N/A"}
                  </td>

                  {/* Duration */}
                  <td className="px-5 py-4 text-gray-400">
                    {formatDuration(title.duration)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        title.isPublished
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {title.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/admin/titles/${title._id}/edit`}
                        className="text-blue-400 transition hover:text-blue-300"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(title._id)}
                        disabled={deletingId === title._id}
                        className="text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === title._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TitleListPage;
