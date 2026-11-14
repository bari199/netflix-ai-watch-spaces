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

// Lock or unlock a WatchSpace
export const setWatchSpaceLock = async (watchSpaceId, isLocked) => {
  const response = await api.patch(`/watch-spaces/${watchSpaceId}/lock`, {
    isLocked,
  });

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
