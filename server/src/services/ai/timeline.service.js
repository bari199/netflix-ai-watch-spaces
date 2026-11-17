import mongoose from "mongoose";
import Title from "../../models/Title.js";
import WatchSpace from "../../models/WatchSpace.js";

export const getTimelineEventsAtPlaybackPosition = async (
  watchSpaceId,
  { diagnostics } = {},
) => {
  if (
    typeof watchSpaceId !== "string" ||
    !mongoose.isObjectIdOrHexString(watchSpaceId)
  ) {
    throw new Error("A valid WatchSpace ID is required");
  }

  if (diagnostics) {
    diagnostics.watchSpaceLookupOutcome = "pending";
  }

  let watchSpace;
  try {
    watchSpace = await WatchSpace.findById(watchSpaceId);
  } catch (error) {
    if (diagnostics) {
      diagnostics.watchSpaceLookupOutcome = "error";
    }

    throw error;
  }

  if (!watchSpace) {
    if (diagnostics) {
      diagnostics.watchSpaceLookupOutcome = "not_found";
    }

    throw new Error("WatchSpace not found");
  }

  if (diagnostics) {
    diagnostics.watchSpaceLookupOutcome = "found";
  }

  const currentTime = watchSpace.playback?.positionSeconds;
  if (diagnostics) {
    diagnostics.playbackPositionSeconds = Number.isFinite(currentTime)
      ? currentTime
      : null;
  }

  if (!Number.isFinite(currentTime) || currentTime < 0) {
    throw new Error("WatchSpace playback position is invalid");
  }

  if (diagnostics) {
    diagnostics.publishedTitleLookupOutcome = "pending";
  }

  let title;
  try {
    title = await Title.findOne({
      _id: watchSpace.title,
      isPublished: true,
    });
  } catch (error) {
    if (diagnostics) {
      diagnostics.publishedTitleLookupOutcome = "error";
    }

    throw error;
  }

  if (!title) {
    if (diagnostics) {
      diagnostics.publishedTitleLookupOutcome = "not_found";
    }

    throw new Error("Published title not found");
  }

  if (diagnostics) {
    diagnostics.publishedTitleLookupOutcome = "found";
  }

  const titleTimeline = Array.isArray(title.timeline) ? title.timeline : [];
  if (diagnostics) {
    diagnostics.timelineEventCount = titleTimeline.length;
  }

  const events = titleTimeline
    .filter(
      (event) =>
        Number.isFinite(event.startTime) && event.startTime <= currentTime,
    )
    .map((event) =>
      typeof event.toObject === "function" ? event.toObject() : event,
    )
    .sort(
      (first, second) =>
        first.startTime - second.startTime ||
        String(first.eventId).localeCompare(String(second.eventId)),
    );

  let temporalAnchorIndex = -1;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];

    if (
      Number.isFinite(event.endTime) &&
      currentTime <= event.endTime &&
      (temporalAnchorIndex === -1 ||
        event.startTime >= events[temporalAnchorIndex].startTime)
    ) {
      temporalAnchorIndex = index;
    }
  }

  if (temporalAnchorIndex === -1 && events.length > 0) {
    temporalAnchorIndex = events.length - 1;
  }

  return {
    watchSpaceId: String(watchSpace._id || watchSpaceId),
    titleId: String(title._id),
    currentTime,
    timelineEventCount: titleTimeline.length,
    events,
    temporalAnchorIndex,
  };
};