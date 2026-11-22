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

// Individual participant vote
const participantVoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    optionId: {
      type: String,
      required: true,
      trim: true,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// Active narrative variation vote
const activeVoteSchema = new mongoose.Schema(
  {
    variationId: {
      type: String,
      required: true,
      trim: true,
    },
    eventId: {
      type: String,
      default: null,
      trim: true,
    },
    mode: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual",
    },
    options: [
      {
        id: {
          type: String,
          required: true,
          trim: true,
        },
        label: {
          type: String,
          required: true,
          trim: true,
        },
        _id: false,
      },
    ],
    status: {
      type: String,
      enum: ["open", "closed", "applied"],
      default: "open",
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
    },
    closesAt: {
      type: Date,
      required: true,
    },
    applyAtSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    votes: {
      type: [participantVoteSchema],
      default: [],
    },
    winningOptionId: {
      type: String,
      default: null,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    playbackMode: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual",
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
    triviaEnabled: {
      type: Boolean,
      default: true,
    },
    triggeredTriviaEventIds: {
      type: [String],
      default: [],
    },
    triggeredVariationEventIds: {
      type: [String],
      default: [],
    },
    votingEnabled: {
      type: Boolean,
      default: true,
    },
    activeVote: {
      type: activeVoteSchema,
      default: null,
    },
    status: {
      type: String,
      enum: ["scheduled", "waiting", "active", "ended"],
      default: "waiting",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    peakParticipants: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiQuestionsAsked: {
      type: Number,
      default: 0,
      min: 0,
    },
    scheduledAt: {
      type: Date,
      default: null,
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
