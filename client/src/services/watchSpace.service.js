import api from "../api/axios.js";

// Get all active public WatchSpaces
export const getActiveWatchSpaces = async () => {
  const response = await api.get("/watch-spaces");
  return response.data;
};

// Get WatchSpace details
export const getWatchSpaceById = async (watchSpaceId) => {
  const response = await api.get(`/watch-spaces/${watchSpaceId}`);
  return response.data;
};

// Ask the AI Co-Pilot using the WatchSpace's server-side playback position
export const askWatchSpaceAI = async (watchSpaceId, question) => {
  const response = await api.post(`/watch-spaces/${watchSpaceId}/ai/ask`, {
    question,
  });
  return response.data;
};

// Get AI questions grounded in the current WatchSpace playback timeline
export const getWatchSpaceAISuggestions = async (
  watchSpaceId,
  { offset = 0, limit = 4 } = {},
) => {
  const response = await api.get(
    `/watch-spaces/${watchSpaceId}/ai/suggestions`,
    {
      params: { offset, limit },
    },
  );

  return response.data;
};

// Create a new WatchSpace
export const createWatchSpace = async (watchSpaceData) => {
  const response = await api.post("/watch-spaces", watchSpaceData);
  return response.data;
};

// Join a WatchSpace
export const joinWatchSpace = async (watchSpaceId, inviteCode) => {
  const payload = inviteCode ? { inviteCode } : {};

  const response = await api.post(
    `/watch-spaces/${watchSpaceId}/join`,
    payload,
  );

  return response.data;
};

// Leave a WatchSpace
export const leaveWatchSpace = async (watchSpaceId) => {
  const response = await api.post(`/watch-spaces/${watchSpaceId}/leave`);
  return response.data;
};

// End a WatchSpace
export const endWatchSpace = async (watchSpaceId) => {
  const response = await api.post(`/watch-spaces/${watchSpaceId}/end`);
  return response.data;
};

// Update WatchSpace voting settings (Host only)
export const updateWatchSpaceVotingSettings = async (
  watchSpaceId,
  votingMode,
  automaticVoteDurationSeconds = 60,
) => {
  const response = await api.patch(
    `/watch-spaces/${watchSpaceId}/voting-settings`,
    {
      votingMode,
      automaticVoteDurationSeconds,
    },
  );

  return response.data;
};

// Lock or unlock a WatchSpace
export const setWatchSpaceLock = async (watchSpaceId, isLocked) => {
  const response = await api.patch(`/watch-spaces/${watchSpaceId}/lock`, {
    isLocked,
  });

  return response.data;
};

// Change the room playback mode (host only).
export const setPlaybackMode = async (watchSpaceId, mode) => {
  const response = await api.patch(
    `/watch-spaces/${watchSpaceId}/playback-mode`,
    { mode },
  );
  return response.data;
};

// Mute or unmute a participant
export const setParticipantMute = async (
  watchSpaceId,
  participantId,
  isMuted,
) => {
  const response = await api.patch(
    `/watch-spaces/${watchSpaceId}/participants/${participantId}/mute`,
    { isMuted },
  );

  return response.data;
};

// Remove a participant
export const removeParticipant = async (watchSpaceId, participantId) => {
  const response = await api.delete(
    `/watch-spaces/${watchSpaceId}/participants/${participantId}`,
  );

  return response.data;
};

// Transfer WatchSpace host
export const transferWatchSpaceHost = async (watchSpaceId, newHostId) => {
  const response = await api.patch(
    `/watch-spaces/${watchSpaceId}/transfer-host`,
    { newHostId },
  );

  return response.data;
};

// Get WatchSpace analytics (Host only)
export const getWatchSpaceAnalytics = async (watchSpaceId) => {
  const response = await api.get(`/analytics/${watchSpaceId}`);
  return response.data;
};

// Get ended WatchSpaces for the logged-in user
export const getMyEndedWatchSpaces = async () => {
  const response = await api.get("/watch-spaces/my-ended?limit=10");
  return response.data;
};

// Get all WatchSpaces hosted by the logged-in user
export const getMyHostedWatchSpaces = async () => {
  const response = await api.get("/watch-spaces/my-hosted?limit=50");
  return response.data;
};

// Get all WatchSpaces hosted or joined by the logged-in user.
export const getMyWatchSpaces = async (limit = 50) => {
  const response = await api.get("/watch-spaces/my", {
    params: { limit },
  });

  return response.data;
};

// Delete a WatchSpace hosted by the logged-in user
export const deleteWatchSpace = async (watchSpaceId) => {
  const response = await api.delete(`/watch-spaces/${watchSpaceId}`);
  return response.data;
};
