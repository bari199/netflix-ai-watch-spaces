import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Users,
  LoaderCircle,
  Plus,
  Video,
  Trash2,
} from "lucide-react";

import {
  getMyHostedWatchSpaces,
  deleteWatchSpace,
} from "../../services/watchSpace.service.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

  return parsedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const statusStyles = {
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  waiting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  ended: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function MyCreatedWatchSpaces() {
  const navigate = useNavigate();

  const [watchSpaces, setWatchSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const [deletingId, setDeletingId] = useState(null);
  const [spaceToDelete, setSpaceToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadWatchSpaces = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getMyHostedWatchSpaces();

        if (isMounted) {
          setWatchSpaces(response?.watchSpaces || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.response?.data?.message || "Unable to load your Watch Spaces.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadWatchSpaces();

    return () => {
      isMounted = false;
    };
  }, []);

  const filters = [
    { id: "all", label: "All" },
    { id: "scheduled", label: "Scheduled" },
    { id: "waiting", label: "Waiting" },
    { id: "active", label: "Active" },
    { id: "ended", label: "Ended" },
  ];

  const filteredSpaces =
    filter === "all"
      ? watchSpaces
      : watchSpaces.filter((space) => space.status === filter);

  const handleDeleteWatchSpace = async () => {
    if (!spaceToDelete || deletingId) return;

    try {
      setDeletingId(spaceToDelete._id);
      setDeleteError("");

      await deleteWatchSpace(spaceToDelete._id);

      setWatchSpaces((prev) =>
        prev.filter((space) => space._id !== spaceToDelete._id),
      );

      setSpaceToDelete(null);
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message || "Unable to delete this Watch Space.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[250px] items-center justify-center gap-3 text-sm text-zinc-400">
        <LoaderCircle size={20} className="animate-spin text-red-500" />
        Loading your Watch Spaces...
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">My Watch Spaces</h2>

          <p className="mt-1 text-xs text-zinc-500">
            Watch Spaces where you are the host.
          </p>
        </div>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
          {watchSpaces.length} Spaces
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
              filter === item.id
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Loading Error */}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      {/* Empty State */}
      {!error && filteredSpaces.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center">
          <Video size={34} className="mx-auto mb-3 text-zinc-500" />

          <h3 className="text-sm font-semibold text-zinc-200">
            {watchSpaces.length === 0
              ? "No Watch Spaces yet"
              : "No spaces found"}
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            {watchSpaces.length === 0
              ? "Watch Spaces you host will appear here."
              : "Try selecting another status filter."}
          </p>

          {watchSpaces.length === 0 && (
            <button
              type="button"
              onClick={() => navigate("/watch-spaces")}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#e50914] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-600"
            >
              <Plus size={15} />
              Explore Watch Spaces
            </button>
          )}
        </div>
      ) : (
        /* Watch Space Cards */
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredSpaces.map((space) => {
            const title = space?.title?.name || "Untitled";
            const status = space?.status || "unknown";
            const participants = space?.participants?.length || 0;

            return (
              <article
                key={space._id}
                className="group flex min-w-0 gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#18181b] p-3 transition hover:border-red-500/40 hover:bg-[#202023]"
              >
                {/* Thumbnail */}
                <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-800 sm:h-32 sm:w-28">
                  {space?.title?._id && space?.title?.thumbnailKey ? (
                    <img
                      src={`${API_BASE_URL}/titles/${space.title._id}/thumbnail`}
                      alt={title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">
                      No thumbnail
                    </div>
                  )}

                  <span
                    className={`absolute bottom-1.5 left-1.5 rounded border px-1.5 py-0.5 text-[9px] font-semibold capitalize ${
                      statusStyles[status] || statusStyles.ended
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* Details and Actions */}
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {title}
                    </h3>

                    <p className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500">
                      <CalendarDays size={12} />
                      {formatDate(space?.createdAt)}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                      <Users size={12} />
                      {participants} participants
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/watch-spaces/${space._id}`)}
                      className="w-fit rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-zinc-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                    >
                      View Space
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setSpaceToDelete(space);
                      }}
                      disabled={deletingId === space._id}
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-[10px] font-semibold text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {spaceToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && deletingId === null) {
              setSpaceToDelete(null);
              setDeleteError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-watch-space-title"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl"
          >
            {/* Dialog Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <Trash2 size={22} />
            </div>

            {/* Dialog Content */}
            <h3
              id="delete-watch-space-title"
              className="text-lg font-bold text-white"
            >
              Delete Watch Space?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {spaceToDelete?.title?.name || "this Watch Space"}
              </span>
              ? This action cannot be undone.
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              This Watch Space will be permanently removed.
            </p>

            {/* Delete Error */}
            {deleteError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400"
              >
                {deleteError}
              </p>
            )}

            {/* Dialog Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSpaceToDelete(null);
                  setDeleteError("");
                }}
                disabled={deletingId !== null}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteWatchSpace}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-[#e50914] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId !== null ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MyCreatedWatchSpaces;
