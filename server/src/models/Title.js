import mongoose from "mongoose";

const timelineEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Number,
      required: true,
      min: 0,
    },
    endTime: {
      type: Number,
      required: true,
      min: 0,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    transcript: {
      type: String,
      default: "",
    },
    trivia: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false },
);

const titleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    genre: [
      {
        type: String,
        trim: true,
      },
    ],
    releaseYear: {
      type: Number,
      min: 1888,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    videoKey: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailKey: {
      type: String,
      default: "",
    },
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

titleSchema.index({ name: "text", description: "text" });
titleSchema.index({ isPublished: 1 });

const Title = mongoose.model("Title", titleSchema);

export default Title;
