// import { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion } from "motion/react";
// import {
//   Users,
//   Play,
//   Radio,
//   ChevronLeft,
//   ChevronRight,
//   Film,
//   CalendarClock,
//   Clock3,
//   CheckCircle2,
// } from "lucide-react";
// import { getMyWatchSpaces } from "../../services/watchSpace.service.js";

// // Use environment configuration instead of hardcoding localhost.
// const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
//   /\/+$/,
//   "",
// );

// const cardVariants = {
//   hidden: {
//     opacity: 0,
//     x: 30,
//   },
//   visible: {
//     opacity: 1,
//     x: 0,
//     transition: {
//       type: "spring",
//       stiffness: 100,
//       damping: 18,
//     },
//   },
// };

// const STATUS_CONFIG = {
//   scheduled: {
//     label: "SCHEDULED",
//     className: "border-blue-500/20 bg-blue-500/10 text-blue-400",
//     icon: CalendarClock,
//   },
//   waiting: {
//     label: "WAITING",
//     className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
//     icon: Clock3,
//   },
//   active: {
//     label: "LIVE",
//     className: "border-green-500/20 bg-green-500/10 text-green-400",
//     icon: Radio,
//   },
//   ended: {
//     label: "ENDED",
//     className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
//     icon: CheckCircle2,
//   },
// };

// function QuickRejoinRooms() {
//   const navigate = useNavigate();
//   const carouselRef = useRef(null);

//   const [rooms, setRooms] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // Fetch all Watch Spaces hosted by the current user.
//   useEffect(() => {
//     let isMounted = true;

//     const fetchMyWatchSpaces = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const response = await getMyWatchSpaces(50);

//         if (!isMounted) return;

//         const fetchedRooms = Array.isArray(response?.watchSpaces)
//           ? response.watchSpaces
//           : [];

//         setRooms(fetchedRooms);
//       } catch (err) {
//         if (!isMounted) return;

//         setError(
//           err.response?.data?.message || "Unable to load your Watch Spaces.",
//         );
//       } finally {
//         if (isMounted) {
//           setLoading(false);
//         }
//       }
//     };
//     fetchMyWatchSpaces();

//     return () => {
//       isMounted = false;
//     };
//   }, []);

//   // Carousel navigation.
//   const slideCarousel = (direction) => {
//     if (!carouselRef.current) return;

//     const carousel = carouselRef.current;
//     const card = carousel.querySelector("[data-room-card]");

//     const cardWidth = card ? card.getBoundingClientRect().width + 16 : 281;

//     carousel.scrollBy({
//       left: direction * cardWidth * 2,
//       behavior: "smooth",
//     });
//   };

//   // Normalize room status before displaying it.
//   const getRoomStatus = (status) => {
//     const normalizedStatus = String(status || "")
//       .toLowerCase()
//       .trim();

//     return STATUS_CONFIG[normalizedStatus] ? normalizedStatus : "waiting";
//   };

//   const getStatusConfig = (status) => {
//     return STATUS_CONFIG[getRoomStatus(status)];
//   };

//   const handleOpenRoom = (room) => {
//     if (!room?._id) return;

//     navigate(`/watch-spaces/${room._id}`);
//   };

//   return (
//     <section className="mt-12 w-full">
//       {/* Section Heading */}
//       <div className="mb-6 flex items-end justify-between gap-4">
//         <div>
//           <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[2px] text-red-500">
//             <Radio size={14} />
//             Your Watch Activity
//           </div>

//           <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
//             Your Watch Spaces
//           </h2>

//           <p className="mt-2 text-sm text-zinc-400">
//             Manage and revisit Watch Spaces you host or have joined.
//           </p>
//         </div>

//         {/* Carousel Navigation */}
//         {!loading && !error && rooms.length > 0 && (
//           <div className="flex shrink-0 items-center gap-2">
//             <button
//               type="button"
//               onClick={() => slideCarousel(-1)}
//               aria-label="Previous rooms"
//               className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e50914] text-white shadow-lg shadow-red-950/20 transition hover:scale-110 hover:bg-red-500 active:scale-95 sm:h-10 sm:w-10"
//             >
//               <ChevronLeft size={21} />
//             </button>

//             <button
//               type="button"
//               onClick={() => slideCarousel(1)}
//               aria-label="Next rooms"
//               className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e50914] text-white shadow-lg shadow-red-950/20 transition hover:scale-110 hover:bg-red-500 active:scale-95 sm:h-10 sm:w-10"
//             >
//               <ChevronRight size={21} />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Loading State */}
//       {loading && (
//         <div className="flex gap-4 overflow-hidden">
//           {[1, 2, 3].map((item) => (
//             <div
//               key={item}
//               className="h-[250px] w-[245px] shrink-0 animate-pulse rounded-xl bg-white/[0.05]"
//             />
//           ))}
//         </div>
//       )}

//       {/* Error State */}
//       {!loading && error && (
//         <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
//           {error}
//         </div>
//       )}

//       {/* Empty State */}
//       {!loading && !error && rooms.length === 0 && (
//         <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
//           <Film size={30} className="mx-auto mb-3 text-zinc-500" />

//           <h3 className="font-semibold text-white">No Watch Spaces Yet</h3>

//           <p className="mt-2 text-sm text-zinc-500">
//             Create your first Watch Space and enjoy movies together.
//           </p>

//           <button
//             type="button"
//             onClick={() => navigate("/watch-spaces/create")}
//             className="mt-5 rounded-lg bg-[#e50914] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
//           >
//             Create Watch Space
//           </button>
//         </div>
//       )}

//       {/* Watch Spaces Carousel */}
//       {!loading && !error && rooms.length > 0 && (
//         <motion.div
//           ref={carouselRef}
//           initial="hidden"
//           animate="visible"
//           variants={{
//             hidden: {},
//             visible: {
//               transition: {
//                 staggerChildren: 0.1,
//               },
//             },
//           }}
//           className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
//         >
//           {rooms.map((room) => {
//             const status = getRoomStatus(room.status);
//             const statusConfig = getStatusConfig(status);
//             const StatusIcon = statusConfig.icon;

//             const thumbnailUrl =
//               room.title?._id && room.title?.thumbnailKey
//                 ? `${API_BASE_URL}/titles/${room.title._id}/thumbnail`
//                 : null;

//             const isActive = status === "active";
//             const isEnded = status === "ended";

//             return (
//               <motion.article
//                 key={room._id}
//                 data-room-card
//                 variants={cardVariants}
//                 initial="hidden"
//                 animate="visible"
//                 whileHover="cardHover"
//                 className="group relative w-[245px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-[#17171b] transition-colors duration-300 hover:border-red-500/50 sm:w-[265px]"
//               >
//                 {/* Movie Thumbnail */}
//                 <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
//                   {thumbnailUrl ? (
//                     <img
//                       src={thumbnailUrl}
//                       alt={room.title?.name || "Movie thumbnail"}
//                       loading="lazy"
//                       className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
//                       onError={(event) => {
//                         event.currentTarget.style.display = "none";

//                         event.currentTarget.parentElement.classList.add(
//                           "flex",
//                           "items-center",
//                           "justify-center",
//                         );

//                         event.currentTarget.nextElementSibling?.classList.remove(
//                           "hidden",
//                         );
//                       }}
//                     />
//                   ) : null}

//                   {!thumbnailUrl && (
//                     <div className="flex h-full items-center justify-center text-sm text-zinc-500">
//                       No thumbnail
//                     </div>
//                   )}

//                   <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

//                   <div className="absolute inset-0 hidden items-center justify-center">
//                     <Film size={30} className="text-zinc-500" />
//                   </div>

//                   {/* Dynamic Room Status */}
//                   <span
//                     className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full border bg-black/70 px-2.5 py-1 text-[10px] font-semibold backdrop-blur ${statusConfig.className}`}
//                   >
//                     {isActive ? (
//                       <motion.span
//                         animate={{ opacity: [1, 0.3, 1] }}
//                         transition={{
//                           duration: 1.5,
//                           repeat: Infinity,
//                         }}
//                         className="h-1.5 w-1.5 rounded-full bg-green-400"
//                       />
//                     ) : (
//                       <StatusIcon size={11} />
//                     )}

//                     {statusConfig.label}
//                   </span>

//                   {/* Participant Count */}
//                   <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur">
//                     <Users size={13} />

//                     {room.participants?.length || 0}

//                     {room.maxParticipants ? ` / ${room.maxParticipants}` : ""}
//                   </span>
//                 </div>

//                 {/* Room Information */}
//                 <div className="p-3">
//                   <h3 className="truncate text-sm font-bold text-white transition-colors group-hover:text-red-400">
//                     {room.title?.name || "Watch Space"}
//                   </h3>

//                   <p className="mt-1 truncate text-[11px] text-zinc-400">
//                     Hosted by {room.host?.name || "Unknown"}
//                   </p>

//                   {/* Room Action */}
//                   <div className="relative mt-3 h-8 overflow-hidden rounded-full">
//                     <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-white/[0.07] text-[11px] font-semibold text-zinc-300 transition-colors duration-300 group-hover:bg-red-600 group-hover:text-white">
//                       <Play size={13} fill="currentColor" />

//                       {isEnded ? "View Room" : "Open Room"}
//                     </div>

//                     <motion.button
//                       type="button"
//                       variants={{
//                         initial: {
//                           x: "-101%",
//                         },
//                         cardHover: {
//                           x: 0,
//                         },
//                       }}
//                       initial="initial"
//                       transition={{
//                         type: "spring",
//                         stiffness: 250,
//                         damping: 25,
//                       }}
//                       onClick={() => handleOpenRoom(room)}
//                       aria-label={`${isEnded ? "View" : "Open"} ${room.title?.name || "Watch Space"}`}
//                       className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-full bg-[#e50914] text-[11px] font-bold text-white hover:bg-red-500"
//                     >
//                       <Play size={13} fill="currentColor" />

//                       {isEnded ? "View Room" : "Open Room"}
//                     </motion.button>
//                   </div>
//                 </div>
//               </motion.article>
//             );
//           })}
//         </motion.div>
//       )}
//     </section>
//   );
// }

// export default QuickRejoinRooms;

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Users,
  Play,
  Radio,
  ChevronLeft,
  ChevronRight,
  Film,
  CalendarClock,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import api from "../../api/axios";

// Use environment configuration instead of hardcoding localhost.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  "",
);

const cardVariants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 18,
    },
  },
};

const STATUS_CONFIG = {
  scheduled: {
    label: "SCHEDULED",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    icon: CalendarClock,
  },
  waiting: {
    label: "WAITING",
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
    icon: Clock3,
  },
  active: {
    label: "LIVE",
    className: "border-green-500/20 bg-green-500/10 text-green-400",
    icon: Radio,
  },
  ended: {
    label: "ENDED",
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
    icon: CheckCircle2,
  },
};

function QuickRejoinRooms() {
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all Watch Spaces hosted by the current user.
  useEffect(() => {
    let isMounted = true;

    const fetchMyHostedRooms = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/watch-spaces/my-hosted?limit=10");

        if (!isMounted) return;

        const fetchedRooms = Array.isArray(response.data?.watchSpaces)
          ? response.data.watchSpaces
          : [];

        setRooms(fetchedRooms);
      } catch (err) {
        if (!isMounted) return;

        setError(
          err.response?.data?.message || "Unable to load your Watch Spaces.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMyHostedRooms();

    return () => {
      isMounted = false;
    };
  }, []);

  // Carousel navigation.
  const slideCarousel = (direction) => {
    if (!carouselRef.current) return;

    const carousel = carouselRef.current;
    const card = carousel.querySelector("[data-room-card]");

    const cardWidth = card ? card.getBoundingClientRect().width + 16 : 281;

    carousel.scrollBy({
      left: direction * cardWidth * 2,
      behavior: "smooth",
    });
  };

  // Normalize room status before displaying it.
  const getRoomStatus = (status) => {
    const normalizedStatus = String(status || "")
      .toLowerCase()
      .trim();

    return STATUS_CONFIG[normalizedStatus] ? normalizedStatus : "waiting";
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[getRoomStatus(status)];
  };

  // Open the existing Watch Space player route.
  const handleOpenRoom = (room) => {
    const roomId = room?._id;

    if (!roomId) {
      console.error("Cannot open Watch Space: Room ID is missing.", room);
      return;
    }

    navigate(`/watch-spaces/${roomId}`);
  };

  return (
    <section className="mt-12 w-full">
      {/* Section Heading */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[2px] text-red-500">
            <Radio size={14} />
            Your Watch Activity
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Your Watch Spaces
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            Manage and revisit the movie sessions you host.
          </p>
        </div>

        {/* Carousel Navigation */}
        {!loading && !error && rooms.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => slideCarousel(-1)}
              aria-label="Previous rooms"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e50914] text-white shadow-lg shadow-red-950/20 transition hover:scale-110 hover:bg-red-500 active:scale-95 sm:h-10 sm:w-10"
            >
              <ChevronLeft size={21} />
            </button>

            <button
              type="button"
              onClick={() => slideCarousel(1)}
              aria-label="Next rooms"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e50914] text-white shadow-lg shadow-red-950/20 transition hover:scale-110 hover:bg-red-500 active:scale-95 sm:h-10 sm:w-10"
            >
              <ChevronRight size={21} />
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-[250px] w-[245px] shrink-0 animate-pulse rounded-xl bg-white/[0.05]"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && rooms.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <Film size={30} className="mx-auto mb-3 text-zinc-500" />

          <h3 className="font-semibold text-white">No Watch Spaces Yet</h3>

          <p className="mt-2 text-sm text-zinc-500">
            Create your first Watch Space and enjoy movies together.
          </p>

          <button
            type="button"
            onClick={() => navigate("/watch-spaces/create")}
            className="mt-5 rounded-lg bg-[#e50914] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Create Watch Space
          </button>
        </div>
      )}

      {/* Watch Spaces Carousel */}
      {!loading && !error && rooms.length > 0 && (
        <motion.div
          ref={carouselRef}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {rooms.map((room) => {
            const status = getRoomStatus(room.status);
            const statusConfig = getStatusConfig(status);
            const StatusIcon = statusConfig.icon;

            const thumbnailUrl =
              room.title?._id && room.title?.thumbnailKey
                ? `${API_BASE_URL}/titles/${room.title._id}/thumbnail`
                : null;

            const isActive = status === "active";
            const isEnded = status === "ended";

            return (
              <motion.article
                key={room._id}
                data-room-card
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4 }}
                className="group relative w-[245px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-[#17171b] transition-colors duration-300 hover:border-red-500/50 sm:w-[265px]"
              >
                {/* Movie Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={room.title?.name || "Movie thumbnail"}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";

                        event.currentTarget.parentElement.classList.add(
                          "flex",
                          "items-center",
                          "justify-center",
                        );

                        event.currentTarget.nextElementSibling?.classList.remove(
                          "hidden",
                        );
                      }}
                    />
                  ) : null}

                  {!thumbnailUrl && (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      No thumbnail
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

                  <div className="absolute inset-0 hidden items-center justify-center">
                    <Film size={30} className="text-zinc-500" />
                  </div>

                  {/* Dynamic Room Status */}
                  <span
                    className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full border bg-black/70 px-2.5 py-1 text-[10px] font-semibold backdrop-blur ${statusConfig.className}`}
                  >
                    {isActive ? (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                        }}
                        className="h-1.5 w-1.5 rounded-full bg-green-400"
                      />
                    ) : (
                      <StatusIcon size={11} />
                    )}

                    {statusConfig.label}
                  </span>

                  {/* Participant Count */}
                  <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur">
                    <Users size={13} />

                    {room.participants?.length || 0}

                    {room.maxParticipants ? ` / ${room.maxParticipants}` : ""}
                  </span>
                </div>

                {/* Room Information */}
                <div className="p-3">
                  <h3 className="truncate text-sm font-bold text-white transition-colors group-hover:text-red-400">
                    {room.title?.name || "Watch Space"}
                  </h3>

                  <p className="mt-1 truncate text-[11px] text-zinc-400">
                    Hosted by {room.host?.name || "Unknown"}
                  </p>

                  {/* Room Action */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenRoom(room)}
                      disabled={!room?._id}
                      aria-label={`${isEnded ? "View" : "Open"} ${room.title?.name || "Watch Space"}`}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e50914] px-4 py-2 text-[11px] font-bold text-white transition-all duration-300 hover:bg-red-500 hover:shadow-lg hover:shadow-red-950/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Play size={13} fill="currentColor" />
                      {isEnded ? "View Room" : "Open Room"}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}

export default QuickRejoinRooms;
