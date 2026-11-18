import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Title",
      required: true,
    },
    watchSpace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WatchSpace",
      default: null,
    },
    watchDurationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPositionSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// One interaction record per user and title
interactionSchema.index({ user: 1, title: 1 }, { unique: true });

interactionSchema.index({ user: 1, lastWatchedAt: -1 });
interactionSchema.index({ title: 1, completionPercentage: -1 });

const Interaction = mongoose.model("Interaction", interactionSchema);

export default Interaction;
