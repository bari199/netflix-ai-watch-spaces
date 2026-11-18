import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function QuickRejoinRooms() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyActiveRooms = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/watch-spaces/my-active?limit=10");

        setRooms(response.data.watchSpaces || []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load your active Watch Spaces.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMyActiveRooms();
  }, []);

  if (loading) {
    return (
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-white">
          Continue Watching Together
        </h2>
        <p className="text-gray-400">Loading your active rooms...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-white">
          Continue Watching Together
        </h2>
        <p className="text-sm text-red-400">{error}</p>
      </section>
    );
  }

  if (rooms.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold text-white">
          Continue Watching Together
        </h2>
        <p className="text-sm text-gray-400">
          You don't have any active Watch Spaces right now.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">
          Continue Watching Together
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Quickly rejoin your active Watch Spaces.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <div
            key={room._id}
            className="rounded-xl border border-white/10 bg-[#202020] p-5 transition hover:border-red-500/60"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                Active
              </span>

              <span className="text-xs text-gray-500">
                {room.participants?.length || 0} participants
              </span>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-white">
              {room.title?.name || "Watch Space"}
            </h3>

            <p className="mb-4 line-clamp-2 text-sm text-gray-400">
              {room.title?.description ||
                "Continue your shared watching session."}
            </p>

            <p className="mb-4 text-xs text-gray-500">
              Hosted by {room.host?.name || "Unknown"}
            </p>

            <button
              type="button"
              onClick={() => navigate(`/watch-spaces/${room._id}`)}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-700"
            >
              Rejoin Room
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default QuickRejoinRooms;
