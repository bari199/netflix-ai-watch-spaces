import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

function UpcomingWatchSpaces() {
  const [watchSpaces, setWatchSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUpcomingWatchSpaces = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/watch-spaces/upcoming?limit=10");

        setWatchSpaces(response.data.watchSpaces || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load upcoming Watch Spaces",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingWatchSpaces();
  }, []);

  if (loading) {
    return (
      <section className="mt-8 text-white">
        <h2 className="text-xl font-bold">Upcoming Watch Spaces</h2>
        <p className="mt-3 text-gray-400">Loading...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8 text-white">
        <h2 className="text-xl font-bold">Upcoming Watch Spaces</h2>
        <p className="mt-3 text-red-400">{error}</p>
      </section>
    );
  }

  return (
    <section className="mt-8 text-white">
      <h2 className="text-xl font-bold">Upcoming Watch Spaces</h2>

      {watchSpaces.length === 0 ? (
        <p className="mt-3 text-gray-400">
          No upcoming scheduled Watch Spaces.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {watchSpaces.map((room) => (
            <div
              key={room._id}
              className="rounded-lg border border-gray-700 bg-[#222] p-4"
            >
              <h3 className="text-lg font-semibold">
                {room.title?.name || "Untitled"}
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Host: {room.host?.name || "Unknown"}
              </p>

              <p className="mt-2 text-sm text-gray-300">
                {new Date(room.scheduledAt).toLocaleString()}
              </p>

              <span className="mt-3 inline-block rounded bg-yellow-600/20 px-3 py-1 text-sm text-yellow-400">
                Scheduled
              </span>

              <button
                onClick={() => navigate(`/watch-spaces/${room._id}`)}
                className="mt-4 block w-full rounded bg-red-600 px-4 py-2 font-medium hover:bg-red-700"
              >
                View Watch Space
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default UpcomingWatchSpaces;
