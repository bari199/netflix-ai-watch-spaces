import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Clapperboard,
  Pencil,
  Trash2,
  Loader2,
  ImageOff,
  Plus,
  Search,
  X,
  RefreshCw,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import api from "../../api/axios.js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const TABS = [
  { value: "published", label: "Published" },
  { value: "drafts", label: "Drafts" },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "duration-desc", label: "Longest first" },
  { value: "duration-asc", label: "Shortest first" },
];

/* ---------- Shared button styles ---------- */

const btnBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-all duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818] disabled:pointer-events-none disabled:opacity-50";

const btnPrimary = `${btnBase} h-10 rounded-lg bg-gradient-to-b from-red-500 to-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 ring-1 ring-inset ring-white/15 hover:from-red-500 hover:to-red-700 hover:shadow-red-600/40 focus-visible:ring-red-400`;

const btnPublish = `${btnBase} h-8 rounded-md bg-gradient-to-b from-green-500 to-green-600 px-3 text-xs text-white shadow-md shadow-green-600/20 ring-1 ring-inset ring-white/15 hover:from-green-500 hover:to-green-700 hover:shadow-green-600/40 focus-visible:ring-green-400`;

const btnEdit = `${btnBase} h-8 rounded-md border border-blue-500/25 bg-blue-500/10 px-3 text-xs text-blue-300 hover:border-blue-400/50 hover:bg-blue-500/20 hover:text-blue-200 focus-visible:ring-blue-400`;

const btnDelete = `${btnBase} h-8 rounded-md border border-red-500/25 bg-red-500/10 px-3 text-xs text-red-300 hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200 focus-visible:ring-red-400`;

const btnGhost = `${btnBase} h-9 rounded-md border border-white/10 bg-[#181818] px-3 text-sm text-zinc-300 hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-white/40`;

const formatDuration = (seconds) => {
  if (!seconds) return "N/A";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
};

/* ---------- Small reusable pieces ---------- */

const Thumbnail = ({ title, className = "" }) => {
  const [failed, setFailed] = useState(false);

  if (!title.thumbnailKey || failed) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-md border border-white/10 bg-[#252525] text-zinc-500 ${className}`}
      >
        <ImageOff size={18} />
      </div>
    );
  }

  return (
    <img
      src={`${API_BASE_URL}/titles/${title._id}/thumbnail`}
      alt={title.name}
      loading="lazy"
      onError={(event) => {
        console.error("Title thumbnail failed:", {
          title: title.name,
          titleId: title._id,
          thumbnailKey: title.thumbnailKey,
          imageUrl: event.currentTarget.src,
        });

        setFailed(true);
      }}
      className={`aspect-video rounded-md border border-white/10 object-cover ${className}`}
    />
  );
};

const GenreBadges = ({ genres }) => {
  if (!genres?.length) {
    return <span className="text-sm text-zinc-500">N/A</span>;
  }

  const visible = genres.slice(0, 2);
  const extra = genres.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((genre) => (
        <Badge
          key={genre}
          variant="secondary"
          className="border-white/10 bg-white/[0.06] font-normal text-zinc-300"
        >
          {genre}
        </Badge>
      ))}
      {extra > 0 && (
        <span
          className="text-xs text-zinc-500"
          title={genres.slice(2).join(", ")}
        >
          +{extra}
        </span>
      )}
    </div>
  );
};

const StatusBadge = ({ published }) => (
  <Badge
    variant="outline"
    className={
      published
        ? "gap-1.5 border-green-500/20 bg-green-500/10 text-green-400"
        : "gap-1.5 border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
    }
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        published ? "bg-green-400" : "bg-yellow-400"
      }`}
    />
    {published ? "Published" : "Draft"}
  </Badge>
);

const headCell =
  "h-11 bg-[#1f1f1f] text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400";

const SortHead = ({ label, field, sortBy, onSort, className = "" }) => {
  const [activeField, direction] = sortBy.split("-");
  const active = activeField === field;
  const Icon = !active
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead className={`${headCell} ${className}`}>
      <button
        type="button"
        onClick={() =>
          onSort(
            active
              ? `${field}-${direction === "asc" ? "desc" : "asc"}`
              : `${field}-asc`,
          )
        }
        className={`group -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 uppercase tracking-[0.08em] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 ${
          active ? "text-white" : ""
        }`}
      >
        {label}
        <Icon
          size={13}
          className={`transition-opacity ${
            active
              ? "text-red-400 opacity-100"
              : "opacity-40 group-hover:opacity-100"
          }`}
        />
      </button>
    </TableHead>
  );
};

const RowActions = ({
  title,
  isDraftTab,
  publishing,
  deleting,
  onPublish,
  onDelete,
  className = "",
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {isDraftTab && (
      <Button
        type="button"
        size="sm"
        onClick={() => onPublish(title._id)}
        disabled={publishing || deleting}
        className={btnPublish}
      >
        {publishing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Publishing
          </>
        ) : (
          <>
            <Rocket size={14} />
            Publish
          </>
        )}
      </Button>
    )}

    <Button asChild variant="outline" size="sm" className={btnEdit}>
      <Link
        to={`/admin/titles/${title._id}/edit${isDraftTab ? "?status=draft" : ""}`}
      >
        <Pencil size={14} />
        Edit
      </Link>
    </Button>

    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onDelete(title)}
      disabled={deleting || publishing}
      aria-label={`Delete ${title.name}`}
      className={btnDelete}
    >
      {deleting ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
      <span className="hidden sm:inline">
        {deleting ? "Deleting" : "Delete"}
      </span>
    </Button>
  </div>
);

/* ---------- Page ---------- */

const TitleListPage = () => {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [titleToDelete, setTitleToDelete] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const [activeTab, setActiveTab] = useState("published");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const isDraftTab = activeTab === "drafts";

  // Fetch titles according to the active tab
  useEffect(() => {
    let isMounted = true;

    const fetchTitles = async () => {
      try {
        setLoading(true);
        setError("");

        const endpoint = isDraftTab ? "/titles/drafts" : "/titles";
        const response = await api.get(endpoint);

        if (isMounted) setTitles(response.data.titles || []);
      } catch (err) {
        if (isMounted) {
          setTitles([]);
          setError(err.response?.data?.message || "Failed to fetch titles.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTitles();

    return () => {
      isMounted = false;
    };
  }, [activeTab, isDraftTab, refreshKey]);

  // Reset to first page whenever the visible set changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, sortBy]);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setSearch("");
    setActiveTab(tab);
  };

  // Delete title
  const handleDelete = async (titleId) => {
    try {
      setDeletingId(titleId);
      setError("");

      await api.delete(`/titles/${titleId}`);

      setTitles((prev) => prev.filter((title) => title._id !== titleId));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete title.");
    } finally {
      setDeletingId(null);
    }
  };

  // Publish draft title
  const handlePublish = async (titleId) => {
    try {
      setPublishingId(titleId);
      setError("");

      await api.patch(`/titles/drafts/${titleId}/publish`);

      setTitles((prev) => prev.filter((title) => title._id !== titleId));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish title.");
    } finally {
      setPublishingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!titleToDelete) return;

    const titleId = titleToDelete._id;
    setTitleToDelete(null);

    await handleDelete(titleId);
  };

  // Search + sort + paginate (client side)
  const filteredTitles = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = titles.filter((title) => {
      if (!query) return true;
      const haystack = [title.name, ...(title.genre || [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    const [key, direction] = sortBy.split("-");

    return [...result].sort((a, b) => {
      const order = direction === "asc" ? 1 : -1;

      if (key === "duration") {
        return ((a.duration || 0) - (b.duration || 0)) * order;
      }

      return (a.name || "").localeCompare(b.name || "") * order;
    });
  }, [titles, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTitles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedTitles = filteredTitles.slice(pageStart, pageStart + PAGE_SIZE);

  const rowProps = (title) => ({
    title,
    isDraftTab,
    publishing: publishingId === title._id,
    deleting: deletingId === title._id,
    onPublish: handlePublish,
    onDelete: setTitleToDelete,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Content"
        title="Manage Titles"
        description="Manage your movies and streaming content."
      >
        <Button asChild className={btnPrimary}>
          <Link to="/admin/titles/create">
            <Plus size={16} strokeWidth={2.5} />
            Create title
          </Link>
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Title status"
          className="inline-flex w-full items-center gap-1 rounded-lg border border-white/10 bg-[#181818] p-1 sm:w-auto"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchTab(tab.value)}
                className={`relative flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 sm:flex-none ${
                  active ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="title-tab-pill"
                    className="absolute inset-0 rounded-md bg-red-600"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search / Sort / Refresh */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or genre"
              aria-label="Search titles"
              className="h-9 border-white/10 bg-[#181818] pl-9 pr-9 text-white placeholder:text-zinc-500 focus-visible:ring-red-500/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 transition-colors hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort titles"
              className="h-9 flex-1 rounded-md border border-white/10 bg-[#181818] px-3 text-sm text-zinc-300 outline-none transition-colors hover:border-white/20 focus-visible:ring-2 focus-visible:ring-red-500/50 sm:flex-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              aria-label="Refresh list"
              className={`${btnGhost} w-9 shrink-0 px-0`}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      <ErrorAlert message={error} />

      {/* Content */}
      {loading ? (
        <Card className="divide-y divide-white/10 overflow-hidden border-white/10 bg-[#181818]">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-4 p-4">
              <Skeleton className="aspect-video w-24 shrink-0 rounded-md bg-white/10 sm:w-28" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-2/3 bg-white/10 sm:w-1/3" />
                <Skeleton className="h-3 w-1/2 bg-white/10 sm:w-1/4" />
              </div>
              <Skeleton className="hidden h-8 w-24 rounded-md bg-white/10 md:block" />
            </div>
          ))}
        </Card>
      ) : filteredTitles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="flex flex-col items-center border-dashed border-white/15 bg-[#181818] px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-400">
              {search ? <Search size={26} /> : <Clapperboard size={26} />}
            </div>

            <p className="text-base font-medium text-white">
              {search
                ? `No titles match “${search}”`
                : isDraftTab
                  ? "No drafts yet"
                  : "No published titles yet"}
            </p>

            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              {search
                ? "Try a different name or genre, or clear the search."
                : isDraftTab
                  ? "Titles you save as drafts will appear here."
                  : "Publish a title and it will show up here."}
            </p>

            {search ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearch("")}
                className={`${btnGhost} mt-5 h-10 px-5`}
              >
                Clear search
              </Button>
            ) : (
              <Button asChild className={`${btnPrimary} mt-5`}>
                <Link to="/admin/titles/create">
                  <Plus size={16} />
                  Create new title
                </Link>
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <Card className="overflow-hidden border-white/10 bg-[#181818] shadow-xl shadow-black/20">
          {/* Desktop / tablet: shadcn table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className={`${headCell} w-[140px] pl-4`}>
                    Thumbnail
                  </TableHead>
                  <SortHead
                    label="Title"
                    field="name"
                    sortBy={sortBy}
                    onSort={setSortBy}
                  />
                  <TableHead className={`${headCell} hidden xl:table-cell`}>
                    Genre
                  </TableHead>
                  <SortHead
                    label="Duration"
                    field="duration"
                    sortBy={sortBy}
                    onSort={setSortBy}
                  />
                  <TableHead className={headCell}>Status</TableHead>
                  <TableHead className={`${headCell} pr-4 text-right`}>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <AnimatePresence initial={false} mode="popLayout">
                  {pagedTitles.map((title) => (
                    <motion.tr
                      key={title._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-white/10 transition-colors last:border-0 hover:bg-white/[0.04]"
                    >
                      <TableCell className="py-3 pl-4">
                        <Thumbnail title={title} className="w-28" />
                      </TableCell>

                      <TableCell className="max-w-[260px]">
                        <p className="truncate font-medium text-white">
                          {title.name}
                        </p>
                        {/* Genre fallback below xl */}
                        <div className="mt-1.5 xl:hidden">
                          <GenreBadges genres={title.genre} />
                        </div>
                      </TableCell>

                      <TableCell className="hidden xl:table-cell">
                        <GenreBadges genres={title.genre} />
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-zinc-400">
                        {formatDuration(title.duration)}
                      </TableCell>

                      <TableCell>
                        <StatusBadge published={title.isPublished} />
                      </TableCell>

                      <TableCell className="pr-4">
                        <RowActions
                          {...rowProps(title)}
                          className="justify-end"
                        />
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Mobile: card list */}
          <ul className="divide-y divide-white/10 md:hidden">
            <AnimatePresence initial={false}>
              {pagedTitles.map((title) => (
                <motion.li
                  key={title._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 p-4"
                >
                  <div className="flex gap-3">
                    <Thumbnail title={title} className="w-28 shrink-0" />

                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="line-clamp-2 font-medium leading-snug text-white">
                        {title.name}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <StatusBadge published={title.isPublished} />
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <Clock size={12} />
                          {formatDuration(title.duration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <GenreBadges genres={title.genre} />

                  <RowActions
                    {...rowProps(title)}
                    className="flex-wrap border-t border-white/10 pt-3"
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {/* Footer: count + pagination */}
          <div className="flex flex-col gap-3 border-t border-white/10 bg-[#1c1c1c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Showing{" "}
              <span className="text-zinc-300">
                {pageStart + 1}–{pageStart + pagedTitles.length}
              </span>{" "}
              of <span className="text-zinc-300">{filteredTitles.length}</span>{" "}
              {filteredTitles.length === 1 ? "title" : "titles"}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`${btnGhost} h-8 gap-1`}
                >
                  <ChevronLeft size={14} />
                  Prev
                </Button>

                <span className="px-2 text-sm text-zinc-400">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`${btnGhost} h-8 gap-1`}
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
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
              <span className="font-medium text-white">
                {titleToDelete?.name}
              </span>{" "}
              will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              className={`${btnGhost} mt-0 h-10 px-5 text-white`}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction onClick={confirmDelete} className={btnPrimary}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TitleListPage;
