import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["host", "viewer"],
      default: "viewer",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const playbackSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      enum: ["playing", "paused", "seeking", "buffering"],
      default: "paused",
    },
    positionSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false },
);

const watchSpaceSchema = new mongoose.Schema(
  {
    title: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Title",
      required: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    playback: {
      type: playbackSchema,
      default: () => ({}),
    },
    maxParticipants: {
      type: Number,
      default: 50,
      min: 2,
      max: 50,
    },
    aiVerbosity: {
      type: String,
      enum: ["minimal", "normal", "chatty"],
      default: "normal",
    },
    votingEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    inviteCode: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const WatchSpace = mongoose.model("WatchSpace", watchSpaceSchema);

export default WatchSpace;
