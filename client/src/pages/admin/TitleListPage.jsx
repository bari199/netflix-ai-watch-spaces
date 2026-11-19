import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, Pencil, Trash2, Loader2, ImageOff } from "lucide-react";
import api from "../../api/axios.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorAlert, PageHeader } from "../../components/admin/adminUi.jsx";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Shared grid template: card layout on small screens, table layout on lg+
const rowGrid =
  "grid gap-4 grid-cols-[6rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)] lg:grid-cols-[7rem_minmax(0,2fr)_minmax(0,1.4fr)_5.5rem_6.5rem_auto] lg:items-center lg:gap-5";

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const TitleListPage = () => {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [titleToDelete, setTitleToDelete] = useState(null);

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

  // Delete is confirmed in the dialog (replaces window.confirm)
  const confirmDelete = async () => {
    if (!titleToDelete) return;

    const titleId = titleToDelete._id;
    setTitleToDelete(null);
    await handleDelete(titleId);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Manage Titles"
        description="Manage your movies and streaming content."
      >
        {!loading && titles.length > 0 && (
          <Badge
            variant="outline"
            className="border-white/15 bg-white/[0.04] px-3 py-1 text-zinc-300"
          >
            {titles.length} {titles.length === 1 ? "title" : "titles"}
          </Badge>
        )}
      </PageHeader>

      <ErrorAlert message={error} />

      {loading ? (
        <Card className="divide-y divide-white/10 border-white/10 bg-[#181818]">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className={`${rowGrid} p-4`}>
              <Skeleton className="aspect-video w-full rounded-md bg-white/10" />
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-2/3 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
              </div>
            </div>
          ))}
        </Card>
      ) : titles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="flex flex-col items-center border-dashed border-white/15 bg-[#181818] px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-400">
              <Clapperboard size={26} />
            </div>
            <p className="text-base font-medium text-white">No titles found.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Titles you add will appear here.
            </p>
          </Card>
        </motion.div>
      ) : (
        <Card className="overflow-hidden border-white/10 bg-[#181818] shadow-xl shadow-black/20">
          {/* Column headers (desktop only) */}
          <div
            className={`${rowGrid} hidden border-b border-white/10 bg-[#202020] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 lg:grid`}
          >
            <span>Thumbnail</span>
            <span>Title</span>
            <span>Genre</span>
            <span>Duration</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-white/10"
          >
            <AnimatePresence initial={false}>
              {titles.map((title) => (
                <motion.li
                  key={title._id}
                  variants={rowVariants}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  layout
                  className={`${rowGrid} p-4 transition-colors hover:bg-white/[0.03]`}
                >
                  {/* Thumbnail */}
                  {title.thumbnailKey ? (
                    <img
                      src={`${API_BASE_URL}/titles/${title._id}/thumbnail`}
                      alt={title.name}
                      className="aspect-video w-full rounded-md border border-white/10 object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.error(
                          "Thumbnail loading failed:",
                          e.currentTarget.src,
                        );
                      }}
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-md bg-[#252525] text-zinc-500">
                      <ImageOff size={18} />
                    </div>
                  )}

                  <div className="flex min-w-0 flex-col gap-2.5 lg:contents">
                    {/* Title */}
                    <p className="truncate font-medium text-white">
                      {title.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:contents">
                      {/* Genre */}
                      <span className="min-w-0 truncate text-sm text-zinc-400">
                        {title.genre?.length ? title.genre.join(", ") : "N/A"}
                      </span>

                      {/* Duration */}
                      <span className="text-sm text-zinc-400">
                        {formatDuration(title.duration)}
                      </span>

                      {/* Status */}
                      <span>
                        <Badge
                          variant="outline"
                          className={
                            title.isPublished
                              ? "border-green-500/20 bg-green-500/10 text-green-400"
                              : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                          }
                        >
                          {title.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 lg:justify-end">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-white/15 bg-transparent text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                      >
                        <Link to={`/admin/titles/${title._id}/edit`}>
                          <Pencil size={14} />
                          Edit
                        </Link>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTitleToDelete(title)}
                        disabled={deletingId === title._id}
                        className="gap-1.5 border-white/15 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        {deletingId === title._id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 size={14} />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(titleToDelete)}
        onOpenChange={(open) => {
          if (!open) setTitleToDelete(null);
        }}
      >
        <AlertDialogContent className="border-white/10 bg-[#181818] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this title?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-white">
                {titleToDelete?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TitleListPage;
