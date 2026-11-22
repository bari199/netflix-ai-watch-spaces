import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Info, Users, GitBranch, Sparkles, MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  askWatchSpaceAI,
  getWatchSpaceById,
  joinWatchSpace,
  leaveWatchSpace,
  endWatchSpace,
  setWatchSpaceLock,
  setPlaybackMode,
  setParticipantMute,
  removeParticipant,
  transferWatchSpaceHost,
} from "../../services/watchSpace.service.js";

import {
  connectSocket,
  disconnectSocket,
} from "../../services/socket.service.js";

import WatchRoomNavbar from "../../components/watchspace/layout/WatchRoomNavbar.jsx";
import RoomHero from "../../components/watchspace/room/RoomHero.jsx";
import RoomDetailsPanel from "../../components/watchspace/room/RoomDetailsPanel.jsx";
import CinematicPlayer from "../../components/watchspace/player/CinematicPlayer.jsx";
import ParticipantsPanel from "../../components/watchspace/participants/ParticipantsPanel.jsx";
import LiveChat from "../../components/watchspace/chat/LiveChat.jsx";
import AICopilot from "../../components/watchspace/ai/AICopilot.jsx";
import GroupStoryVote from "../../components/watchspace/voting/GroupStoryVote.jsx";
import TriviaNotification from "../../components/watchspace/common/TriviaNotification.jsx";
import ErrorAlert from "../../components/watchspace/common/ErrorAlert.jsx";
import HostDisconnectedAlert from "../../components/watchspace/common/HostDisconnectedAlert.jsx";
import LoadingScreen from "../../components/watchspace/common/LoadingScreen.jsx";
import {
  playWatchSpaceFeedback,
  unlockWatchSpaceAudio,
} from "../../utils/watchSpaceFeedback.js";

// Configure VITE_API_BASE_URL in the frontend .env file.
// The relative fallback avoids hardcoding a local development host.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  "",
);

const WatchPageDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { watchSpaceId } = useParams();
  const { user } = useAuth();

  const [watchSpace, setWatchSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  const [onlineParticipants, setOnlineParticipants] = useState([]);
  const [connectionLatency, setConnectionLatency] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState("checking");
  const [hostDisconnected, setHostDisconnected] = useState(false);

  // Narrative variation voting
  const [activeVote, setActiveVote] = useState(null);
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [selectedVoteOption, setSelectedVoteOption] = useState("");
  const [voteDuration, setVoteDuration] = useState(30);
  const [voteSecondsLeft, setVoteSecondsLeft] = useState(0);
  const [voteResult, setVoteResult] = useState(null);
  const [voteMessage, setVoteMessage] = useState("");
  const [voteLoading, setVoteLoading] = useState(false);
  const [unreadVoteCount, setUnreadVoteCount] = useState(0);
  const [triviaCards, setTriviaCards] = useState([]);
  const [subtitleSelection, setSubtitleSelection] = useState(null);
  const [playerStarted, setPlayerStarted] = useState(false);
  const [startPlayerOnMount, setStartPlayerOnMount] = useState(false);
  const [playbackModeSaving, setPlaybackModeSaving] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat");

  const videoRef = useRef(null);
  const activeSidebarTabRef = useRef("chat");
  const chatMessagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const aiSubmittingRef = useRef(false);
  const seenTriviaEventIdsRef = useRef(new Set());
  const applyingRemoteUpdateRef = useRef(false);
  const qualityIntervalRef = useRef(null);
  const fetchRequestIdRef = useRef(0);

  const inviteJoinAttemptRef = useRef("");
  const inviteCode = new URLSearchParams(location.search).get("inviteCode");
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const currentUserId = String(user?._id || user?.id || "");

  const getUserId = (value) => {
    if (!value) return "";

    if (typeof value === "string") {
      return value;
    }

    return String(value._id || value.id || "");
  };

  const fetchWatchSpace = useCallback(async () => {
    if (!watchSpaceId) return;

    const requestId = ++fetchRequestIdRef.current;

    try {
      setLoading(true);
      setError("");

      const response = await getWatchSpaceById(watchSpaceId);

      // Ignore responses belonging to an older WatchSpace route.
      if (requestId !== fetchRequestIdRef.current) return;

      const fetchedWatchSpace = response?.watchSpace || null;
      setWatchSpace(fetchedWatchSpace);
      setActiveVote(fetchedWatchSpace?.activeVote || null);
      setUnreadVoteCount(
        fetchedWatchSpace?.activeVote?.status === "open" ? 1 : 0,
      );
    } catch (err) {
      if (requestId === fetchRequestIdRef.current) {
        setError(err?.response?.data?.message || "Failed to load WatchSpace.");
        setWatchSpace(null);
      }
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [watchSpaceId]);

  useEffect(() => {
    const unlockAudio = () => unlockWatchSpaceAudio();

    // Browsers block Web Audio until a user gesture. Unlock it once while
    // the participant interacts with the WatchSpace, before a poll arrives.
    window.addEventListener("pointerdown", unlockAudio, {
      once: true,
      capture: true,
    });
    window.addEventListener("keydown", unlockAudio, {
      once: true,
      capture: true,
    });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio, true);
    };
  }, []);

  useEffect(() => {
    // Invalidate any request started for the previous route.
    fetchRequestIdRef.current += 1;
    setWatchSpace(null);
    setLoading(true);
    setError("");

    setChatMessages([]);
    setTypingUsers([]);
    setChatInput("");
    setOnlineParticipants([]);
    setConnectionLatency(null);
    setConnectionQuality("checking");
    setHostDisconnected(false);

    setAiQuestion("");
    setAiResponse(null);
    setAiError(null);
    setIsAskingAI(false);
    aiSubmittingRef.current = false;

    setActiveVote(null);
    setSelectedVariationId("");
    setSelectedVoteOption("");
    setVoteSecondsLeft(0);
    setVoteResult(null);
    setVoteMessage("");
    setUnreadVoteCount(0);
    setTriviaCards([]);
    setSubtitleSelection(null);
    setPlayerStarted(false);
    setActiveSidebarTab("chat");
    activeSidebarTabRef.current = "chat";

    seenTriviaEventIdsRef.current.clear();
  }, [watchSpaceId]);

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        replace: true,
        state: {
          from: {
            pathname: location.pathname,
            search: location.search,
          },
        },
      });
      return;
    }

    // Redeem a private-room invite before fetching details. A visitor who is
    // not yet a participant may not be allowed to read private room details.
    if (inviteCode) {
      const attemptKey = `${watchSpaceId}:${inviteCode}`;

      // Prevent duplicate join requests (including React StrictMode effect replay).
      if (inviteJoinAttemptRef.current === attemptKey) {
        return;
      }

      inviteJoinAttemptRef.current = attemptKey;

      const redeemInvite = async () => {
        try {
          setLoading(true);
          setError("");

          await joinWatchSpace(watchSpaceId, inviteCode);

          // Removing the query triggers this effect again; it will then load
          // the now-accessible WatchSpace details.
          navigate(`/watch-spaces/${watchSpaceId}`, { replace: true });
        } catch (err) {
          setError(
            err?.response?.data?.message ||
              "Failed to join with this invite link.",
          );
          setWatchSpace(null);
          setLoading(false);
        }
      };

      redeemInvite();
      return;
    }

    // The invite query has been removed; allow a later invite visit.
    inviteJoinAttemptRef.current = "";
    fetchWatchSpace();
  }, [
    user,
    navigate,
    location.pathname,
    location.search,
    inviteCode,
    watchSpaceId,
    fetchWatchSpace,
  ]);

  const participants = watchSpace?.participants || [];

  const hostId = getUserId(watchSpace?.host);

  const isHost = Boolean(currentUserId && hostId === currentUserId);

  const isParticipant = participants.some(
    (participant) => getUserId(participant?.user) === currentUserId,
  );

  const isEnded = watchSpace?.status === "ended";

  const title = watchSpace?.title;
  const titleId = getUserId(title);
  const displayTitle = title?.name || title?.title || "Untitled Movie";
  const playbackPosition = Number(watchSpace?.playback?.positionSeconds) || 0;
  const activeTimelineEvent = (title?.timeline || [])
    .filter(
      (event) =>
        Number(event.startTime) <= playbackPosition &&
        Number(event.endTime) >= playbackPosition,
    )
    .sort(
      (first, second) => Number(second.startTime) - Number(first.startTime),
    )[0];

  // Keep all four AI Co-Pilot prompt cards visible at every playback position.
  // The backend remains responsible for grounding answers in available timeline metadata.
  const aiSuggestedQuestions = [
    {
      type: "scene",
      label: "Explain this scene",
      question: "Explain the important scenes and events so far.",
      description: "Understand scenes and story events",
      icon: "🎬",
    },
    {
      type: "characterAppearance",
      label: "Explore characters",
      question: "Which characters have appeared so far?",
      description: "Explore character appearances",
      icon: "👤",
    },
    {
      type: "trivia",
      label: "Interesting facts",
      question: "What interesting facts are available so far?",
      description: "Discover available trivia",
      icon: "💡",
    },
    {
      type: "glossary",
      label: "Explain a term",
      question: "Explain the important terms introduced so far.",
      description: "Understand important terms",
      icon: "📖",
    },
  ];

  const subtitleVariants = (
    Array.isArray(title?.subtitleVariants) ? title.subtitleVariants : []
  ).filter((variant) => {
    if (!variant || typeof variant !== "object" || !variant.variantId) {
      return false;
    }

    const eventMatches =
      !variant.eventId ||
      String(activeTimelineEvent?.eventId) === String(variant.eventId);
    const variationMatches =
      !variant.variationId ||
      (activeVote?.status === "applied" &&
        String(activeVote.variationId) === String(variant.variationId) &&
        String(activeVote.winningOptionId) === String(variant.optionId));

    return eventMatches && variationMatches;
  });

  const browserLocale =
    typeof navigator !== "undefined" && typeof navigator.language === "string"
      ? navigator.language
      : "";
  const normalizedBrowserLocale = browserLocale.toLowerCase();
  const browserLanguage = normalizedBrowserLocale.split("-")[0];
  const preferredSubtitle =
    subtitleVariants.find(
      (variant) =>
        typeof variant.locale === "string" &&
        variant.locale.toLowerCase() === normalizedBrowserLocale,
    ) ||
    subtitleVariants.find(
      (variant) =>
        typeof variant.locale === "string" &&
        variant.locale.split("-")[0].toLowerCase() === browserLanguage,
    ) ||
    subtitleVariants[0];
  const selectedSubtitleId =
    subtitleSelection?.watchSpaceId === watchSpaceId
      ? subtitleSelection.variantId
      : null;
  const selectedSubtitle =
    selectedSubtitleId === "off"
      ? null
      : subtitleVariants.find(
          (variant) => String(variant.variantId) === String(selectedSubtitleId),
        ) || preferredSubtitle;
  const currentAiResponse =
    aiResponse?.watchSpaceId === watchSpaceId ? aiResponse : null;
  const currentAiError =
    aiError?.watchSpaceId === watchSpaceId ? aiError.message : "";
  const aiSourceEvents = (
    Array.isArray(currentAiResponse?.sourceEvents)
      ? currentAiResponse.sourceEvents
      : []
  ).map((eventId) => ({
    eventId,
    timelineEvent: (title?.timeline || []).find(
      (event) => String(event?.eventId) === String(eventId),
    ),
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateSubtitleTracks = () => {
      Array.from(video.textTracks).forEach((track) => {
        track.mode =
          selectedSubtitle && track.label === selectedSubtitle.label
            ? "showing"
            : "disabled";
      });
    };

    updateSubtitleTracks();
    video.textTracks.addEventListener?.("addtrack", updateSubtitleTracks);

    return () => {
      video.textTracks.removeEventListener?.("addtrack", updateSubtitleTracks);
    };
  }, [subtitleVariants, selectedSubtitle?.variantId, selectedSubtitle?.label]);

  // Socket Connection, Chat, Presence and Playback Sync
  useEffect(() => {
    if (!user || !watchSpace?._id || !isParticipant || isEnded) {
      return undefined;
    }

    let active = true;
    let roomJoined = false;
    let syncInterval = null;
    let socket;

    try {
      socket = connectSocket();
      socketRef.current = socket;
    } catch (err) {
      console.error("Socket connection failed:", err);
      return undefined;
    }

    const joinRoom = () => {
      if (!active || roomJoined || !socket.connected) {
        return;
      }

      socket.emit("room.join", { watchSpaceId }, (response) => {
        if (!active) return;

        if (!response?.success) {
          console.error("Room join failed:", response?.message);
          return;
        }

        roomJoined = true;

        console.log("WatchSpace room joined:", response);

        if (["manual", "automatic"].includes(response.playbackMode)) {
          setWatchSpace((previous) =>
            previous
              ? { ...previous, playbackMode: response.playbackMode }
              : previous,
          );
        }

        // Apply a pending restoration after the video metadata is available.
        const playback = response.playback;
        if (playback && Number.isFinite(Number(playback.positionSeconds))) {
          const restoredPosition = Math.max(0, Number(playback.positionSeconds));
          const restoredState = playback.state || "paused";

          setWatchSpace((previous) =>
            previous
              ? {
                  ...previous,
                  playback: {
                    ...previous.playback,
                    ...playback,
                    positionSeconds: restoredPosition,
                    state: restoredState,
                  },
                }
              : previous,
          );

          const restoreVideo = () => {
            const video = videoRef.current;
            if (!video || video.readyState < 1) return false;

            applyingRemoteUpdateRef.current = true;
            if (Math.abs(video.currentTime - restoredPosition) > 0.5) {
              video.currentTime = restoredPosition;
            }

            if (restoredState === "playing") {
              video.play().catch((playError) => {
                console.warn("Playback resume requires a user gesture:", playError?.message);
              });
            } else {
              video.pause();
            }

            requestAnimationFrame(() => {
              applyingRemoteUpdateRef.current = false;
            });
            return true;
          };

          if (!restoreVideo()) {
            const video = videoRef.current;
            if (video) {
              const handleMetadata = () => {
                restoreVideo();
                video.removeEventListener("loadedmetadata", handleMetadata);
              };
              video.addEventListener("loadedmetadata", handleMetadata);
            }
          }
        }

        socket.emit(
          "variation.vote.state.get",
          { watchSpaceId },
          (voteStateResponse) => {
            if (!active || !voteStateResponse?.success) return;
            const persistedVote = voteStateResponse.activeVote || null;
            setActiveVote(persistedVote);
            if (persistedVote?.status === "closed") {
              setVoteResult({
                variationId: persistedVote.variationId,
                voteCounts: Object.fromEntries(
                  (persistedVote.options || []).map((option) => [
                    option.id,
                    (persistedVote.votes || []).filter(
                      (vote) => vote.optionId === option.id,
                    ).length,
                  ]),
                ),
                winningOptionId: persistedVote.winningOptionId,
                applyAtSeconds: persistedVote.applyAtSeconds,
              });
            }
          },
        );

        socket.emit("presence.join", { watchSpaceId }, (presenceResponse) => {
          if (!active) return;

          if (presenceResponse?.success) {
            console.log("Presence registered successfully.");
          } else {
            console.error(
              "Presence registration failed:",
              presenceResponse?.message,
            );
          }
        });

        socket.emit(
          "chat.history.get",
          {
            watchSpaceId,
            limit: 50,
          },
          (chatResponse) => {
            if (!active) return;

            if (chatResponse?.success) {
              setChatMessages(chatResponse.messages || []);
            } else {
              console.error(
                "Failed to load chat history:",
                chatResponse?.message,
              );
            }
          },
        );
      });
    };

    const handlePlaybackModeChanged = (data) => {
      if (
        !active ||
        String(data?.watchSpaceId) !== String(watchSpaceId) ||
        !["manual", "automatic"].includes(data?.mode)
      ) return;

      setWatchSpace((previous) =>
        previous ? { ...previous, playbackMode: data.mode } : previous,
      );
    };

    const handleDisconnect = (reason) => {
      roomJoined = false;
      setOnlineParticipants([]);

      console.warn("Socket disconnected:", reason);
    };

    // Connection Quality Measurement
    const measureConnectionQuality = () => {
      if (!active || !roomJoined || !socket.connected) {
        setConnectionQuality("offline");
        setConnectionLatency(null);
        return;
      }

      const clientSentAt = Date.now();

      socket.emit(
        "room.sync.ping",
        { watchSpaceId, clientSentAt },
        (response) => {
          if (!active) return;

          if (!response?.success) {
            setConnectionQuality("poor");
            setConnectionLatency(null);
            return;
          }

          const latency = Date.now() - clientSentAt;

          setConnectionLatency(latency);

          if (latency < 150) {
            setConnectionQuality("good");
          } else if (latency < 300) {
            setConnectionQuality("fair");
          } else {
            setConnectionQuality("poor");
          }
        },
      );
    };

    const handleConnectError = (err) => {
      console.error("Socket connection error:", err?.message);
    };

    // Remote Playback Update
    const handlePlaybackUpdate = async (data) => {
      if (!active || String(data?.watchSpaceId) !== String(watchSpaceId)) {
        return;
      }

      const video = videoRef.current;
      const payload = data?.payload;

      if (!payload) return;

      // Update React playback state for BOTH Host and Viewer
      setWatchSpace((previous) => {
        if (!previous) return previous;

        const playbackState = {
          play: "playing",
          pause: "paused",
          seek: "seeking",
          buffering: "buffering",
        }[payload.state];

        return {
          ...previous,
          playback: {
            ...previous.playback,
            ...(playbackState ? { state: playbackState } : {}),
            ...(Number.isFinite(Number(payload.positionSeconds))
              ? { positionSeconds: Number(payload.positionSeconds) }
              : {}),
          },
        };
      });

      // Host disconnect notification
      if (payload.reason === "host_disconnected") {
        setHostDisconnected(true);
      } else if (
        payload.issuedBy &&
        String(payload.issuedBy) !== String(currentUserId)
      ) {
        setHostDisconnected(false);
      }

      if (!video) return;

      // Do not re-apply playback to the user who issued the command.
      // Their local video is already playing or paused.
      if (payload.issuedBy && String(payload.issuedBy) === currentUserId) {
        return;
      }

      applyingRemoteUpdateRef.current = true;

      try {
        const position = Number(payload.positionSeconds);

        if (
          Number.isFinite(position) &&
          position >= 0 &&
          Math.abs(video.currentTime - position) > 0.25
        ) {
          video.currentTime = position;
        }

        if (payload.state === "play") {
          try {
            await video.play();
          } catch (err) {
            console.warn("Remote playback could not start:", err?.message);
          }
        } else if (payload.state === "pause") {
          video.pause();
        }

        console.log("Playback update received:", payload);
      } finally {
        requestAnimationFrame(() => {
          applyingRemoteUpdateRef.current = false;
        });
      }
    };

    const handleAuthoritativePosition = (data) => {
      if (!active || String(data?.watchSpaceId) !== String(watchSpaceId)) {
        return;
      }

      if (!Number.isFinite(data?.positionSeconds) || data.positionSeconds < 0) {
        return;
      }

      setWatchSpace((previous) =>
        previous
          ? {
              ...previous,
              playback: {
                ...previous.playback,
                positionSeconds: data.positionSeconds,
              },
            }
          : previous,
      );
    };

    // Playback Drift Correction
    const handleSyncCorrection = (data) => {
      if (!active || String(data?.watchSpaceId) !== String(watchSpaceId)) {
        return;
      }

      const video = videoRef.current;
      const payload = data?.payload;

      if (!video || !payload) return;

      const targetPosition = Number(payload.targetPositionSeconds);

      if (
        !Number.isFinite(targetPosition) ||
        targetPosition < 0 ||
        video.readyState < 1
      ) {
        return;
      }

      const drift = Math.abs(targetPosition - video.currentTime);

      if (drift <= 0.25) return;

      applyingRemoteUpdateRef.current = true;
      video.currentTime = targetPosition;

      console.log("Playback drift corrected:", {
        targetPosition,
        drift,
      });

      requestAnimationFrame(() => {
        applyingRemoteUpdateRef.current = false;
      });
    };

    // Online Presence Update
    const handlePresenceUpdate = (data) => {
      if (!active || String(data?.watchSpaceId) !== String(watchSpaceId)) {
        return;
      }

      setOnlineParticipants(data.participants || []);
    };

    // New Chat Message
    const handleNewChatMessage = (data) => {
      if (
        !active ||
        String(data?.watchSpaceId) !== String(watchSpaceId) ||
        !data?.payload
      ) {
        return;
      }

      setChatMessages((previousMessages) => {
        const incomingMessage = data.payload;
        const messageId = incomingMessage._id;

        if (
          messageId &&
          previousMessages.some((message) => message._id === messageId)
        ) {
          return previousMessages;
        }

        return [...previousMessages, incomingMessage];
      });
    };

    // Typing Indicator
    const handleTypingUpdate = (data) => {
      if (
        !active ||
        String(data?.watchSpaceId) !== String(watchSpaceId) ||
        !data?.user
      ) {
        return;
      }

      const typingUserId = getUserId(data.user);

      if (!typingUserId || typingUserId === currentUserId) {
        return;
      }

      setTypingUsers((previousUsers) => {
        if (data.isTyping) {
          if (
            previousUsers.some(
              (typingUser) => getUserId(typingUser) === typingUserId,
            )
          ) {
            return previousUsers;
          }

          return [...previousUsers, data.user];
        }

        return previousUsers.filter(
          (typingUser) => getUserId(typingUser) !== typingUserId,
        );
      });
    };

    // Emoji Reaction Update
    const handleReactionUpdated = (data) => {
      if (
        !active ||
        String(data?.watchSpaceId) !== String(watchSpaceId) ||
        !data?.payload
      ) {
        return;
      }

      setChatMessages((previousMessages) =>
        previousMessages.map((message) =>
          message._id === data.payload._id ? data.payload : message,
        ),
      );
    };

    // Narrative Variation Voting Events
    const handleVoteOpen = (data) => {
      if (
        !active ||
        String(data?.watchSpaceId) !== String(watchSpaceId) ||
        !data?.variationId
      ) return;

      setActiveVote({
        variationId: data.variationId,
        question: data.question || "",
        eventId: data.eventId || null,
        mode: data.mode || "manual",
        options: data.options || [],
        status: "open",
        durationSeconds: data.durationSeconds || 30,
        closesAt: data.closesAt,
      });
      if (activeSidebarTabRef.current !== "vote") {
        setUnreadVoteCount((count) => count + 1);
      }
      setSelectedVoteOption("");
      setVoteResult(null);
      playWatchSpaceFeedback();
      setVoteMessage("A new group vote has started.");
    };

    const handleVoteResult = (data) => {
      if (
        !active ||
        String(data?.watchSpaceId) !== String(watchSpaceId) ||
        !data?.variationId
      ) return;

      setActiveVote((previous) => {
        if (!previous || previous.variationId !== data.variationId) {
          return previous;
        }

        return {
          ...previous,
          status: "closed",
          winningOptionId: data.winningOptionId,
          voteCounts: data.voteCounts || {},
          applyAtSeconds: data.applyAtSeconds,
        };
      });

      setVoteResult(data);
      playWatchSpaceFeedback();
      setVoteMessage("Voting has ended. The group result is ready.");
    };

    const handleVariationApplied = (data) => {
      if (
        !active ||
        String(data?.watchSpaceId) !== String(watchSpaceId) ||
        !data?.variationId
      ) return;

      setActiveVote((previous) => {
        if (!previous || previous.variationId !== data.variationId) {
          return previous;
        }

        return {
          ...previous,
          status: "applied",
          winningOptionId: data.winningOptionId,
          appliedAt: data.appliedAt,
          applyAtSeconds: data.applyAtSeconds,
        };
      });

      playWatchSpaceFeedback();
      setVoteMessage("The selected variation has been applied.");
    };

    const handleTriviaEvent = (data) => {
      if (!active || !data?.eventId || !data?.text) return;
      if (seenTriviaEventIdsRef.current.has(data.eventId)) return;

      seenTriviaEventIdsRef.current.add(data.eventId);
      setTriviaCards((previous) => [
        ...previous,
        {
          watchSpaceId,
          eventId: data.eventId,
          text: data.text,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      ]);
    };

    // Register Socket Events
    socket.on("connect", joinRoom);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.on("room.playback.update", handlePlaybackUpdate);
    socket.on("room.playback.mode.changed", handlePlaybackModeChanged);
    socket.on("room.playback.position", handleAuthoritativePosition);

    socket.on("room.sync.correction", handleSyncCorrection);

    socket.on("presence.updated", handlePresenceUpdate);

    socket.on("chat.message.new", handleNewChatMessage);

    socket.on("chat.typing.update", handleTypingUpdate);

    socket.on("chat.reaction.updated", handleReactionUpdated);
    socket.on("room.ai.trivia", handleTriviaEvent);
    socket.on("room.variation.voteOpen", handleVoteOpen);
    socket.on("room.variation.voteResult", handleVoteResult);
    socket.on("room.variation.applied", handleVariationApplied);

    if (socket.connected) {
      joinRoom();
    }

    // Automatic Connection Quality Check
    measureConnectionQuality();

    qualityIntervalRef.current = setInterval(() => {
      measureConnectionQuality();
    }, 5000);

    // Playback Position Report
    syncInterval = setInterval(() => {
      if (!active || !roomJoined || !socket.connected) {
        return;
      }

      const video = videoRef.current;

      if (!video || video.readyState < 1) {
        return;
      }

      socket.emit("room.sync.report", {
        watchSpaceId,
        positionSeconds: video.currentTime,
      });
    }, 1000);

    // Cleanup
    return () => {
      active = false;

      if (syncInterval) {
        clearInterval(syncInterval);
      }

      if (qualityIntervalRef.current) {
        clearInterval(qualityIntervalRef.current);
        qualityIntervalRef.current = null;
      }

      socket.off("connect", joinRoom);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);

      socket.off("room.playback.update", handlePlaybackUpdate);
      socket.off("room.playback.mode.changed", handlePlaybackModeChanged);
      socket.off("room.playback.position", handleAuthoritativePosition);

      socket.off("room.sync.correction", handleSyncCorrection);

      socket.off("presence.updated", handlePresenceUpdate);

      socket.off("chat.message.new", handleNewChatMessage);

      socket.off("chat.typing.update", handleTypingUpdate);

      socket.off("chat.reaction.updated", handleReactionUpdated);
      socket.off("room.ai.trivia", handleTriviaEvent);
      socket.off("room.variation.voteOpen", handleVoteOpen);
      socket.off("room.variation.voteResult", handleVoteResult);
      socket.off("room.variation.applied", handleVariationApplied);

      if (roomJoined && socket.connected) {
        socket.emit("room.leave", { watchSpaceId });
        socket.emit("presence.leave", { watchSpaceId });
      }

      if (socketRef.current === socket) {
        socketRef.current = null;
        disconnectSocket();
      }
    };
  }, [
    user,
    watchSpace?._id,
    isParticipant,
    isEnded,
    watchSpaceId,
    currentUserId,
  ]);

  // The Hero is rendered before the video element exists. Wait until the
  // player is mounted, then start the media as soon as it can play.
  useEffect(() => {
    if (!startPlayerOnMount || !playerStarted) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    let cancelled = false;
    const startPlayback = () => {
      if (cancelled) return;
      setStartPlayerOnMount(false);
      video.play().catch((playError) => {
        console.warn("Video autoplay was blocked:", playError?.message);
        setError("Press Play in the video player to start playback.");
      });
    };

    if (video.readyState >= 2) {
      requestAnimationFrame(startPlayback);
    } else {
      video.addEventListener("canplay", startPlayback, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", startPlayback);
    };
  }, [startPlayerOnMount, playerStarted]);

  // Keep the vote countdown synchronized with the backend closesAt timestamp.
  useEffect(() => {
    if (!activeVote || activeVote.status !== "open" || !activeVote.closesAt) {
      setVoteSecondsLeft(0);
      return undefined;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(activeVote.closesAt).getTime() - Date.now()) / 1000,
        ),
      );
      setVoteSecondsLeft(remaining);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 500);

    return () => clearInterval(timer);
  }, [activeVote?.status, activeVote?.closesAt]);

  // Host starts a vote using a pre-authored variation point from the Title timeline.
  const handleStartVote = () => {
    const socket = socketRef.current;

    if (!socket?.connected || !selectedVariationId || voteLoading) {
      setVoteMessage(
        "Select a variation point and make sure you are connected.",
      );
      return;
    }

    setVoteLoading(true);
    setVoteMessage("");

    socket.emit(
      "variation.vote.start",
      {
        watchSpaceId,
        variationId: selectedVariationId,
        durationSeconds: Number(voteDuration),
      },
      (response) => {
        setVoteLoading(false);

        if (!response?.success) {
          setVoteMessage(response?.message || "Could not start the vote.");
          return;
        }

        setVoteMessage("Vote started successfully.");
      },
    );
  };

  // Participants can cast or change their vote while the vote is open.
  const handleCastVote = (optionId) => {
    const socket = socketRef.current;

    if (!socket?.connected || !activeVote || activeVote.status !== "open") {
      setVoteMessage("There is no active vote.");
      return;
    }

    setVoteLoading(true);
    setVoteMessage("");

    socket.emit(
      "variation.vote.cast",
      {
        watchSpaceId,
        optionId,
      },
      (response) => {
        setVoteLoading(false);

        if (!response?.success) {
          setVoteMessage(
            response?.message || "Your vote could not be recorded.",
          );
          return;
        }

        setSelectedVoteOption(optionId);
        setVoteMessage("Your vote has been recorded.");
      },
    );
  };

  // Host Playback Controls
  const emitPlaybackControl = useCallback(
    (action) => {
      if (!isHost || applyingRemoteUpdateRef.current) {
        return;
      }

      const socket = socketRef.current;
      const video = videoRef.current;

      if (!socket?.connected || !video) {
        console.warn("Socket or video player is not ready.");
        return;
      }

      const payload = {
        watchSpaceId,
        action,
        positionSeconds: Number.isFinite(video.currentTime)
          ? video.currentTime
          : playbackPosition,
      };

      socket.emit("playback.control", payload, (response) => {
        if (response?.success) {
          console.log("Playback command sent:", payload);
        } else {
          console.error("Playback command failed:", response?.message);
        }
      });
    },
    [isHost, watchSpaceId],
  );

  // Change host playback mode without navigating or refreshing the page.
  const handlePlaybackModeChange = async (mode) => {
    if (!isHost || !watchSpace || playbackModeSaving) return;

    const previousMode = watchSpace.playbackMode || "manual";
    if (mode === previousMode) return;

    setPlaybackModeSaving(true);
    setError("");

    try {
      const response = await setPlaybackMode(watchSpaceId, mode);
      setWatchSpace((previous) =>
        previous
          ? {
              ...previous,
              ...response.watchSpace,
              title: previous.title,
              playbackMode: response.watchSpace?.playbackMode || mode,
            }
          : previous,
      );
    } catch (modeError) {
      setError(
        modeError?.response?.data?.message ||
          "Could not update playback mode.",
      );
    } finally {
      setPlaybackModeSaving(false);
    }
  };

  // Chat Input
  const handleChatInputChange = (event) => {
    const value = event.target.value;
    setChatInput(value);

    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit("chat.typing", {
        watchSpaceId,
        isTyping: value.trim().length > 0,
      });
    }
  };

  const handleChatInputBlur = () => {
    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit("chat.typing", {
        watchSpaceId,
        isTyping: false,
      });
    }
  };

  // Send Chat Message
  const handleSendMessage = (event) => {
    event.preventDefault();

    const message = chatInput.trim();
    const socket = socketRef.current;

    if (
      !message ||
      !socket?.connected ||
      isSendingMessage ||
      !isParticipant ||
      isEnded
    ) {
      return;
    }

    setIsSendingMessage(true);

    socket.emit(
      "chat.message.send",
      {
        watchSpaceId,
        message,
      },
      (response) => {
        setIsSendingMessage(false);

        if (response?.success) {
          setChatInput("");

          socket.emit("chat.typing", {
            watchSpaceId,
            isTyping: false,
          });
        } else {
          setError(response?.message || "Failed to send message.");
        }
      },
    );
  };

  const handleAskAI = async (event) => {
    event.preventDefault();

    const question = aiQuestion.trim();
    if (
      !question ||
      !watchSpaceId ||
      aiSubmittingRef.current ||
      (!isHost && !isParticipant) ||
      isEnded
    ) {
      return;
    }

    aiSubmittingRef.current = true;
    setIsAskingAI(true);
    setAiError(null);
    setAiResponse(null);

    try {
      const response = await askWatchSpaceAI(watchSpaceId, question);
      if (typeof response?.answer !== "string") {
        throw new Error("The AI response was incomplete. Please try again.");
      }

      setAiResponse({
        watchSpaceId,
        answer: response.answer,
        sourceEvents: Array.isArray(response.sourceEvents)
          ? response.sourceEvents
          : [],
      });
      setAiQuestion("");
    } catch (requestError) {
      setAiError({
        watchSpaceId,
        message:
          requestError?.response?.data?.message ||
          requestError?.message ||
          "The AI Co-Pilot is unavailable right now. Please try again.",
      });
    } finally {
      aiSubmittingRef.current = false;
      setIsAskingAI(false);
    }
  };

  // Emoji Reaction
  const handleChatReaction = (messageId, emoji) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setError("Chat connection is unavailable.");
      return;
    }

    socket.emit(
      "chat.reaction.add",
      {
        watchSpaceId,
        messageId,
        emoji,
      },
      (response) => {
        if (!response?.success) {
          setError(response?.message || "Failed to update reaction.");
        }
      },
    );
  };

  // Common Action Handler
  const handleAction = async (action) => {
    try {
      setActionLoading(true);
      setError("");

      await action();
      await fetchWatchSpace();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!watchSpace?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(watchSpace.inviteCode);
      setCopiedInviteCode(true);

      setTimeout(() => {
        setCopiedInviteCode(false);
      }, 2000);
    } catch {
      setError("Failed to copy invite code.");
    }
  };

  const handleCopyInviteLink = async () => {
    if (!watchSpace?.isPrivate || !watchSpace?.inviteCode) return;

    const inviteLink = new URL(
      `/watch-spaces/${watchSpaceId}`,
      window.location.origin,
    );

    inviteLink.searchParams.set("inviteCode", watchSpace.inviteCode);

    try {
      await navigator.clipboard.writeText(inviteLink.toString());

      setCopiedInviteLink(true);

      setTimeout(() => {
        setCopiedInviteLink(false);
      }, 2000);
    } catch {
      setError("Failed to copy invite link.");
    }
  };

  const handleJoin = async () => {
    await handleAction(() => joinWatchSpace(watchSpaceId));
  };

  const handleLeave = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to leave this WatchSpace?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");

      await leaveWatchSpace(watchSpaceId);
      navigate("/watch-spaces");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to leave WatchSpace.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to end this WatchSpace?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");

      await endWatchSpace(watchSpaceId);
      navigate("/watch-spaces");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to end WatchSpace.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async () => {
    await handleAction(() =>
      setWatchSpaceLock(watchSpaceId, !watchSpace.isLocked),
    );
  };

  const handleMute = async (participant) => {
    const participantId = getUserId(participant?.user);

    if (!participantId) return;

    await handleAction(() =>
      setParticipantMute(watchSpaceId, participantId, !participant.isMuted),
    );
  };

  const handleRemove = async (participant) => {
    const participantId = getUserId(participant?.user);

    if (!participantId) return;

    const participantName =
      participant?.user?.name ||
      participant?.user?.fullName ||
      "this participant";

    const confirmed = window.confirm(
      `Remove ${participantName} from this room?`,
    );

    if (!confirmed) return;

    await handleAction(() => removeParticipant(watchSpaceId, participantId));
  };

  const handleTransferHost = async (participant) => {
    const newHostId = getUserId(participant?.user);

    if (!newHostId) return;

    const participantName =
      participant?.user?.name ||
      participant?.user?.fullName ||
      "this participant";

    const confirmed = window.confirm(
      `Transfer host role to ${participantName}?`,
    );

    if (!confirmed) return;

    await handleAction(() => transferWatchSpaceHost(watchSpaceId, newHostId));
  };

  // Loading
  if (loading) {
    return <LoadingScreen message="Loading your WatchSpace..." />;
  }

  // Not Found
  if (!watchSpace) {
    return (
      <div className="min-h-screen bg-[#141414] p-8 text-center text-white">
        <p className="text-red-400">{error || "WatchSpace not found."}</p>

        <Link
          to="/watch-spaces"
          className="mt-5 inline-block text-red-500 hover:text-red-400"
        >
          Back to WatchSpaces
        </Link>
      </div>
    );
  }

  // Movie Information
  const thumbnailUrl = title?.thumbnailKey
    ? `${API_BASE_URL}/titles/${titleId}/thumbnail`
    : undefined;

  const videoUrl = titleId ? `${API_BASE_URL}/titles/${titleId}/video` : null;

  const hostName =
    watchSpace.host?.name || watchSpace.host?.fullName || "Unknown";

  const currentPlaybackState = watchSpace.playback?.state || "paused";
  // Keep the movie player mounted after it has been entered, including paused state.
  const isPlayerVisible =
    playerStarted ||
    currentPlaybackState === "playing" ||
    playbackPosition > 0;

  const variationPoints = Array.isArray(title?.timeline)
    ? title.timeline.filter(
        (event) =>
          event?.eventType === "variationPoint" &&
          event?.variationId &&
          Array.isArray(event?.options) &&
          event.options.length >= 2,
      )
    : [];

  const sidebarTabs = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "room", label: "Room", icon: Info },
    { id: "participants", label: "People", icon: Users },
    { id: "vote", label: "Vote", icon: GitBranch },
    { id: "ai", label: "AI Co-Pilot", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <WatchRoomNavbar user={user} />

      <main className="mx-auto max-w-[1600px] px-3 py-3 sm:px-5 lg:px-7">
        <div className="mb-3 space-y-2">
          <ErrorAlert error={error} onDismiss={() => setError("")} />
          <HostDisconnectedAlert hostDisconnected={hostDisconnected} />
          <TriviaNotification
            triviaCards={triviaCards}
            watchSpaceId={watchSpaceId}
            setTriviaCards={setTriviaCards}
          />
        </div>

        <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* Main column: cinematic player */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0 overflow-hidden rounded-2xl">
              {isPlayerVisible ? (
                <CinematicPlayer
                  videoRef={videoRef}
                  videoUrl={videoUrl}
                  thumbnailUrl={thumbnailUrl}
                  titleId={titleId}
                  title={displayTitle}
                  isHost={isHost}
                  subtitleVariants={subtitleVariants}
                  selectedSubtitle={selectedSubtitle}
                  onSubtitleChange={(variantId) =>
                    setSubtitleSelection({ watchSpaceId, variantId })
                  }
                  onPlay={() => {
                    setPlayerStarted(true);
                    emitPlaybackControl("play");
                  }}
                  onPause={() => emitPlaybackControl("pause")}
                  onSeeked={() => emitPlaybackControl("seek")}
                  pendingHeroStart={startPlayerOnMount}
                  variationPoints={variationPoints}
                />
              ) : (
                <RoomHero
                  watchSpace={watchSpace}
                  title={{ ...title, name: displayTitle }}
                  hostName={hostName}
                  participantCount={participants.length}
                  isEnded={isEnded}
                  isPlaying={false}
                  onPlay={
                    isHost
                      ? () => {
                          setStartPlayerOnMount(true);
                          setPlayerStarted(true);
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>

          {/* Right sidebar: one selected panel at a time */}
          <aside className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-2xl shadow-black/30">
            <div className="border-b border-white/10 p-2">
              <div
                role="tablist"
                aria-label="Watch Space panels"
                className="grid grid-cols-5 gap-1"
              >
                {sidebarTabs.map(({ id, label, icon: Icon }) => {
                  const isActive = activeSidebarTab === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`watchspace-tab-${id}`}
                      aria-selected={isActive}
                      aria-controls={`watchspace-panel-${id}`}
                      onClick={() => {
                        activeSidebarTabRef.current = id;
                        setActiveSidebarTab(id);
                        if (id === "vote") setUnreadVoteCount(0);
                      }}
                      className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-3 text-[10px] font-semibold transition sm:text-[11px] ${
                        isActive
                          ? "bg-red-600/15 text-red-400 ring-1 ring-inset ring-red-500/25"
                          : "text-white/45 hover:bg-white/[0.06] hover:text-white/85"
                      }`}
                    >
                      <span className="relative inline-flex">
                        <Icon size={17} />
                        {id === "vote" && unreadVoteCount > 0 && (
                          <span
                            aria-label={`${unreadVoteCount} new group vote${unreadVoteCount === 1 ? "" : "s"}`}
                            className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#101010] bg-red-600 px-1 text-[9px] font-extrabold leading-none text-white shadow-lg"
                          >
                            {unreadVoteCount > 99 ? "99+" : unreadVoteCount}
                          </span>
                        )}
                      </span>
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              id={`watchspace-panel-${activeSidebarTab}`}
              role="tabpanel"
              aria-labelledby={`watchspace-tab-${activeSidebarTab}`}
              className="min-w-0 p-3 sm:p-4"
            >
              {activeSidebarTab === "chat" &&
                (isParticipant && !isEnded ? (
                  <LiveChat
                    chatMessages={chatMessages}
                    currentUserId={currentUserId}
                    getUserId={getUserId}
                    handleChatReaction={handleChatReaction}
                    typingUsers={typingUsers}
                    chatInput={chatInput}
                    handleChatInputChange={handleChatInputChange}
                    handleChatInputBlur={handleChatInputBlur}
                    handleSendMessage={handleSendMessage}
                    isSendingMessage={isSendingMessage}
                    chatMessagesEndRef={chatMessagesEndRef}
                  />
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <MessageCircle
                      className="mx-auto mb-2 text-white/30"
                      size={22}
                    />
                    <p className="text-sm font-semibold text-white/70">
                      {isEnded
                        ? "This Watch Space has ended"
                        : "Join the room to chat"}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Live conversation and reactions are available to room
                      participants.
                    </p>
                  </div>
                ))}

              {activeSidebarTab === "room" && (
                <RoomDetailsPanel
                  watchSpace={watchSpace}
                  title={title}
                  hostName={hostName}
                  participantCount={participants.length}
                  currentPlaybackState={currentPlaybackState}
                  isEnded={isEnded}
                  isHost={isHost}
                  isParticipant={isParticipant}
                  actionLoading={actionLoading}
                  connectionQuality={connectionQuality}
                  connectionLatency={connectionLatency}
                  copiedInviteCode={copiedInviteCode}
                  copiedInviteLink={copiedInviteLink}
                  onCopyInviteCode={handleCopyInviteCode}
                  onCopyInviteLink={handleCopyInviteLink}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  onToggleLock={handleToggleLock}
                  onEnd={handleEnd}
                />
              )}

              {activeSidebarTab === "participants" && (
                <ParticipantsPanel
                  participants={participants}
                  onlineParticipants={onlineParticipants}
                  hostId={hostId}
                  isHost={isHost}
                  isEnded={isEnded}
                  loading={loading}
                  actionLoading={actionLoading}
                  getUserId={getUserId}
                  onRefresh={fetchWatchSpace}
                  onMute={handleMute}
                  onTransferHost={handleTransferHost}
                  onRemove={handleRemove}
                />
              )}

              {activeSidebarTab === "vote" &&
                (isParticipant && !isEnded ? (
                  <GroupStoryVote
                    isParticipant={isParticipant}
                    isHost={isHost}
                    isEnded={isEnded}
                    votingEnabled={Boolean(watchSpace.votingEnabled)}
                    playbackMode={watchSpace.playbackMode || "manual"}
                    playbackModeSaving={playbackModeSaving}
                    onPlaybackModeChange={handlePlaybackModeChange}
                    activeVote={activeVote}
                    voteSecondsLeft={voteSecondsLeft}
                    variationPoints={variationPoints}
                    selectedVariationId={selectedVariationId}
                    setSelectedVariationId={setSelectedVariationId}
                    voteDuration={voteDuration}
                    setVoteDuration={setVoteDuration}
                    handleStartVote={handleStartVote}
                    handleCastVote={handleCastVote}
                    selectedVoteOption={selectedVoteOption}
                    voteLoading={voteLoading}
                    voteMessage={voteMessage}
                    voteResult={voteResult}
                  />
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <GitBranch
                      className="mx-auto mb-2 text-white/30"
                      size={22}
                    />
                    <p className="text-sm font-semibold text-white/70">
                      Group voting unavailable
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Join an active Watch Space to participate in story votes.
                    </p>
                  </div>
                ))}

              {activeSidebarTab === "ai" &&
                ((isHost || isParticipant) && !isEnded ? (
                  <AICopilot
                    aiSuggestedQuestions={aiSuggestedQuestions}
                    aiQuestion={aiQuestion}
                    setAiQuestion={setAiQuestion}
                    handleAskAI={handleAskAI}
                    isAskingAI={isAskingAI}
                    currentAiError={currentAiError}
                    currentAiResponse={currentAiResponse}
                    aiSourceEvents={aiSourceEvents}
                  />
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <Sparkles
                      className="mx-auto mb-2 text-white/30"
                      size={22}
                    />
                    <p className="text-sm font-semibold text-white/70">
                      AI Co-Pilot unavailable
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Join an active Watch Space to ask questions about the
                      movie timeline.
                    </p>
                  </div>
                ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default WatchPageDetails;
