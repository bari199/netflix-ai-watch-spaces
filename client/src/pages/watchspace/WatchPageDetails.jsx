import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  getWatchSpaceById,
  joinWatchSpace,
  leaveWatchSpace,
  endWatchSpace,
  setWatchSpaceLock,
  setParticipantMute,
  removeParticipant,
  transferWatchSpaceHost,
} from "../../services/watchSpace.service.js";

import {
  connectSocket,
  disconnectSocket,
} from "../../services/socket.service.js";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "👏"];

const WatchPageDetails = () => {
  const { watchSpaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [watchSpace, setWatchSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [onlineParticipants, setOnlineParticipants] = useState([]);
  const [connectionLatency, setConnectionLatency] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState("checking");
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const applyingRemoteUpdateRef = useRef(false);
  const chatMessagesEndRef = useRef(null);
  const qualityIntervalRef = useRef(null);

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

    try {
      setLoading(true);
      setError("");

      const response = await getWatchSpaceById(watchSpaceId);

      setWatchSpace(response?.watchSpace || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load WatchSpace.");
    } finally {
      setLoading(false);
    }
  }, [watchSpaceId]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    fetchWatchSpace();
  }, [user, navigate, fetchWatchSpace]);

  const participants = watchSpace?.participants || [];

  const hostId = getUserId(watchSpace?.host);

  const isHost = Boolean(currentUserId && hostId === currentUserId);

  const isParticipant = participants.some(
    (participant) => getUserId(participant?.user) === currentUserId,
  );

  const isEnded = watchSpace?.status === "ended";

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chatMessages, typingUsers]);

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

      if (payload.reason === "host_disconnected") {
        setHostDisconnected(true);
      } else if (
        payload.issuedBy &&
        String(payload.issuedBy) !== String(currentUserId)
      ) {
        setHostDisconnected(false);
      }

      if (!video || !payload) return;

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

    // Register Socket Events
    socket.on("connect", joinRoom);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.on("room.playback.update", handlePlaybackUpdate);

    socket.on("room.sync.correction", handleSyncCorrection);

    socket.on("presence.updated", handlePresenceUpdate);

    socket.on("chat.message.new", handleNewChatMessage);

    socket.on("chat.typing.update", handleTypingUpdate);

    socket.on("chat.reaction.updated", handleReactionUpdated);

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

      socket.off("room.sync.correction", handleSyncCorrection);

      socket.off("presence.updated", handlePresenceUpdate);

      socket.off("chat.message.new", handleNewChatMessage);

      socket.off("chat.typing.update", handleTypingUpdate);

      socket.off("chat.reaction.updated", handleReactionUpdated);

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
        positionSeconds: video.currentTime,
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414] text-gray-400">
        Loading WatchSpace...
      </div>
    );
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
  const title = watchSpace.title;
  const titleId = getUserId(title);

  const thumbnailUrl = title?.thumbnailKey
    ? `${API_BASE_URL}/titles/${titleId}/thumbnail`
    : undefined;

  const videoUrl = titleId ? `${API_BASE_URL}/titles/${titleId}/video` : null;

  const hostName =
    watchSpace.host?.name || watchSpace.host?.fullName || "Unknown";

  const currentPlaybackState = watchSpace.playback?.state || "paused";

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/watch-spaces" className="text-xl font-bold text-red-600">
            NETFLIX <span className="text-white">WATCH SPACES</span>
          </Link>

          <div className="text-sm text-gray-400">
            {user?.name || user?.fullName || "User"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-10">
        <Link
          to="/watch-spaces"
          className="inline-block text-sm text-gray-400 transition hover:text-white"
        >
          ← Back to WatchSpaces
        </Link>

        {hostDisconnected && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            Host disconnected. Playback has been paused for everyone.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Movie Player and WatchSpace Details */}
        <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Video Player */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#181818]">
            <div className="aspect-video bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={thumbnailUrl}
                  controls={isHost}
                  playsInline
                  preload="metadata"
                  onPlay={() => emitPlaybackControl("play")}
                  onPause={() => emitPlaybackControl("pause")}
                  onSeeked={() => emitPlaybackControl("seek")}
                  className="h-full w-full object-contain"
                >
                  Your browser does not support HTML5 video.
                </video>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Video Not Available
                </div>
              )}
            </div>

            <div className="space-y-4 p-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {title?.name || "Untitled Movie"}
                </h1>

                <p className="mt-2 text-sm text-gray-400">
                  {title?.description || "No description available."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                {title?.releaseYear && <span>{title.releaseYear}</span>}

                {title?.duration && <span>{title.duration} min</span>}

                {title?.genre && (
                  <span>
                    {Array.isArray(title.genre)
                      ? title.genre.join(", ")
                      : title.genre}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* WatchSpace Details */}
          <aside className="space-y-5 rounded-xl border border-white/10 bg-[#181818] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">WatchSpace Details</h2>

              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  isEnded
                    ? "bg-gray-500/10 text-gray-400"
                    : "bg-green-500/10 text-green-400"
                }`}
              >
                {isEnded ? "Ended" : "Live"}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-400">Room Name</p>

              <p className="mt-1 font-medium">
                {watchSpace.name || title?.name || "WatchSpace"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Host</p>

              <p className="mt-1 font-medium">{hostName}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Participants</p>

              <p className="mt-1 font-medium">{participants.length}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Room Privacy</p>

              <p className="mt-1 font-medium">
                {watchSpace.isLocked ? "Private / Locked" : "Public"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Playback</p>

              <p className="mt-1 font-medium capitalize">
                {currentPlaybackState}
              </p>
            </div>

            {/* Connection Quality */}
            <div>
              <p className="text-sm text-gray-400">Connection Quality</p>

              <p
                className={`mt-1 font-medium ${
                  connectionQuality === "good"
                    ? "text-green-400"
                    : connectionQuality === "fair"
                      ? "text-yellow-400"
                      : connectionQuality === "poor" ||
                          connectionQuality === "offline"
                        ? "text-red-400"
                        : "text-gray-400"
                }`}
              >
                {connectionQuality === "checking"
                  ? "Checking..."
                  : connectionQuality === "good"
                    ? "Good"
                    : connectionQuality === "fair"
                      ? "Fair"
                      : connectionQuality === "poor"
                        ? "Poor"
                        : "Offline"}

                {connectionLatency !== null && ` · ${connectionLatency} ms`}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-3">
              {!isParticipant && !isEnded && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Please wait..." : "Join Room"}
                </button>
              )}

              {isParticipant && !isHost && !isEnded && (
                <button
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Leave Room
                </button>
              )}

              {isHost && !isEnded && (
                <>
                  <button
                    onClick={handleToggleLock}
                    disabled={actionLoading}
                    className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                  >
                    {watchSpace.isLocked ? "Unlock Room" : "Lock Room"}
                  </button>

                  <button
                    onClick={handleEnd}
                    disabled={actionLoading}
                    className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    End WatchSpace
                  </button>
                </>
              )}
            </div>
          </aside>
        </section>

        {/* Host Controls */}
        {isHost && !isEnded && (
          <section className="rounded-xl border border-white/10 bg-[#181818] p-6">
            <h2 className="mb-4 text-xl font-semibold">Host Controls</h2>

            <button
              onClick={handleToggleLock}
              disabled={actionLoading}
              className="rounded-lg bg-white/10 px-5 py-3 text-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              {watchSpace.isLocked ? "Unlock Room" : "Lock Room"}
            </button>
          </section>
        )}

        {/* Participants */}
        <section className="rounded-xl border border-white/10 bg-[#181818] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Participants ({participants.length})
            </h2>

            <div className="flex items-center gap-3">
              <span className="text-xs text-green-400">
                {onlineParticipants.length} Online
              </span>

              <button
                onClick={fetchWatchSpace}
                disabled={loading || actionLoading}
                className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {participants.length === 0 ? (
            <p className="text-sm text-gray-400">No participants found.</p>
          ) : (
            <div className="space-y-3">
              {participants.map((participant, index) => {
                const participantUser = participant.user;

                const participantId = getUserId(participantUser);

                const participantIsHost =
                  participant.role === "host" || participantId === hostId;

                // Check Online Status
                const isOnline = onlineParticipants.some(
                  (onlineParticipant) =>
                    getUserId(onlineParticipant?.user || onlineParticipant) ===
                    participantId,
                );

                const participantName =
                  participantUser?.name ||
                  participantUser?.fullName ||
                  "Unknown User";

                const avatar =
                  participantUser?.avatar || participantUser?.avatarUrl;

                return (
                  <div
                    key={participantId || index}
                    className="flex flex-col justify-between gap-4 rounded-lg border border-white/10 bg-[#202020] p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={participantName}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 font-bold">
                          {participantName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-medium">{participantName}</p>

                        {/* Role, Online Status and Mute Status */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-gray-400">
                            {participantIsHost ? "Host" : "Viewer"}
                          </span>

                          <span
                            className={`flex items-center gap-1 ${
                              isOnline ? "text-green-400" : "text-gray-500"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isOnline ? "bg-green-400" : "bg-gray-500"
                              }`}
                            />

                            {isOnline ? "Online" : "Offline"}
                          </span>

                          {participant.isMuted && (
                            <span className="text-gray-400">Muted</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Host Participant Actions */}
                    {isHost &&
                      !participantIsHost &&
                      !isEnded &&
                      participantId && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleMute(participant)}
                            disabled={actionLoading}
                            className="rounded-md bg-white/10 px-3 py-2 text-xs hover:bg-white/20 disabled:opacity-50"
                          >
                            {participant.isMuted ? "Unmute" : "Mute"}
                          </button>

                          <button
                            onClick={() => handleTransferHost(participant)}
                            disabled={actionLoading}
                            className="rounded-md bg-blue-500/10 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
                          >
                            Transfer Host
                          </button>

                          <button
                            onClick={() => handleRemove(participant)}
                            disabled={actionLoading}
                            className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* WatchSpace Live Chat */}
        {isParticipant && !isEnded && (
          <section className="rounded-xl border border-white/10 bg-[#181818] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Live Chat</h2>

                <p className="mt-1 text-sm text-gray-400">
                  Chat with everyone watching together
                </p>
              </div>

              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                Live
              </span>
            </div>

            {/* Messages */}
            <div className="mb-4 flex max-h-[420px] min-h-[200px] flex-col gap-4 overflow-y-auto rounded-lg bg-[#101010] p-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                chatMessages.map((message, index) => {
                  const sender = message.sender || message.user;

                  const senderId = getUserId(sender);

                  const senderName =
                    sender?.name || sender?.fullName || "Unknown User";

                  const messageText =
                    message.message || message.content || message.text || "";

                  const reactions = Array.isArray(message.reactions)
                    ? message.reactions
                    : [];

                  return (
                    <div
                      key={message._id || index}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {senderId === currentUserId ? "You" : senderName}
                        </span>

                        <span className="text-xs text-gray-500">
                          {message.createdAt
                            ? new Date(message.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : ""}
                        </span>
                      </div>

                      <p className="break-words text-sm text-gray-300">
                        {messageText}
                      </p>

                      {/* Emoji Reactions */}
                      <div className="flex flex-wrap gap-2">
                        {REACTION_EMOJIS.map((emoji) => {
                          const matchingReactions = reactions.filter(
                            (reaction) => reaction.emoji === emoji,
                          );

                          const count = matchingReactions.length;

                          const hasReacted = matchingReactions.some(
                            (reaction) =>
                              getUserId(reaction.user) === currentUserId,
                          );

                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                handleChatReaction(message._id, emoji)
                              }
                              disabled={!message._id}
                              aria-label={`React with ${emoji}`}
                              className={`rounded-full border px-2 py-1 text-xs transition ${
                                hasReacted
                                  ? "border-red-500 bg-red-500/20"
                                  : "border-white/10 bg-white/5 hover:bg-white/10"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {emoji} {count > 0 ? count : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={chatMessagesEndRef} />
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <p className="mb-3 text-xs text-gray-400">
                {typingUsers
                  .map(
                    (typingUser) =>
                      typingUser.name || typingUser.fullName || "Someone",
                  )
                  .join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </p>
            )}

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={handleChatInputChange}
                onBlur={handleChatInputBlur}
                maxLength={2000}
                placeholder="Type your message..."
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#252525] px-4 py-3 text-sm text-white outline-none focus:border-red-500"
              />

              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingMessage}
                className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingMessage ? "Sending..." : "Send"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};

export default WatchPageDetails;
