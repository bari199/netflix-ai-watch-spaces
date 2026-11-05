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
    maxParticipants: {
      type: Number,
      default: 50,
      min: 2,
      max: 50,
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
    maxParticipants: {
      type: Number,
      default: 50,
      min: 2,
      max: 50,
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
    inviteCode: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const WatchSpace = mongoose.model("WatchSpace", watchSpaceSchema);

export default WatchSpace;
