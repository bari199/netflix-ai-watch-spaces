import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { existsSync } from "fs";

import connectDB from "../src/config/db.js";
import Interaction from "../src/models/Interaction.js";
import Title from "../src/models/Title.js";

import { buildRecommendations } from "../src/services/recommendation.service.js";

// Load environment variables.
// Supports both server/.env and project-root .env.
const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];

const envPath = envCandidates.find((filePath) => existsSync(filePath));

if (envPath) {
  dotenv.config({ path: envPath });
}

const TOP_K = 5;
const MIN_COMPLETION_PERCENTAGE = 50;

const normalizeId = (value) => String(value?._id || value);

const evaluateRecommendations = async () => {
  console.log("\n======================================");
  console.log("   RECOMMENDATION EVALUATION");
  console.log("======================================\n");

  // Connect to MongoDB.
  await connectDB();

  // Load published titles.
  const publishedTitles = await Title.find({
    isPublished: true,
  })
    .select("name description genre releaseYear duration thumbnailKey")
    .lean();

  // Load all interactions without modifying database records.
  const allInteractions = await Interaction.find({})
    .select("user title completionPercentage rating isCompleted")
    .lean();

  // Load populated interactions for content-based filtering.
  const populatedInteractions = await Interaction.find({})
    .populate({
      path: "title",
      select: "name description genre releaseYear duration",
    })
    .lean();

  console.log(`Published titles: ${publishedTitles.length}`);
  console.log(`Total interactions: ${allInteractions.length}`);

  if (publishedTitles.length < TOP_K) {
    console.log(
      `\nWARNING: Only ${publishedTitles.length} published titles available. ` +
        `Precision@5 will use the standard denominator of 5, ` +
        `but the candidate catalogue is smaller than K=5.`,
    );
  }

  if (allInteractions.length === 0) {
    throw new Error("No interaction data found.");
  }

  // Select one relevant held-out interaction per user.
  // Relevance rule: completion >= 50% OR rating >= 4.
  const bestInteractionByUser = new Map();

  for (const interaction of allInteractions) {
    if (!interaction.user || !interaction.title) continue;

    const completion = Number(interaction.completionPercentage || 0);

    const rating = Number(interaction.rating || 0);

    const isRelevant = completion >= MIN_COMPLETION_PERCENTAGE || rating >= 4;

    if (!isRelevant) continue;

    const userId = normalizeId(interaction.user);

    const currentBest = bestInteractionByUser.get(userId);

    const currentScore = completion + rating * 10;

    const bestScore = currentBest
      ? Number(currentBest.completionPercentage || 0) +
        Number(currentBest.rating || 0) * 10
      : -1;

    if (!currentBest || currentScore > bestScore) {
      bestInteractionByUser.set(userId, interaction);
    }
  }

  const heldOutInteractions = [...bestInteractionByUser.values()];

  if (heldOutInteractions.length === 0) {
    throw new Error(
      "No relevant interactions found. " +
        "Need completion >= 50% or rating >= 4.",
    );
  }

  // Keep held-out records out of training data.
  const heldOutIds = new Set(
    heldOutInteractions.map((interaction) => normalizeId(interaction._id)),
  );

  const trainingInteractions = allInteractions.filter(
    (interaction) => !heldOutIds.has(normalizeId(interaction._id)),
  );

  console.log(`Held-out interactions: ${heldOutInteractions.length}`);

  console.log(`Training interactions: ${trainingInteractions.length}`);

  console.log("\n--------------------------------------");
  console.log("EVALUATION RESULTS");
  console.log("--------------------------------------\n");

  let totalHits = 0;
  let evaluatedUsers = 0;

  for (const heldOut of heldOutInteractions) {
    const userId = normalizeId(heldOut.user);
    const relevantTitleId = normalizeId(heldOut.title);

    const relevantTitle = publishedTitles.find(
      (title) => normalizeId(title._id) === relevantTitleId,
    );

    if (!relevantTitle) {
      console.log(`Skipping user ${userId}: held-out title is not published.`);
      continue;
    }

    // User's training history excludes their held-out interaction.
    const userTrainingInteractions = populatedInteractions.filter(
      (interaction) =>
        normalizeId(interaction.user) === userId &&
        !heldOutIds.has(normalizeId(interaction._id)),
    );

    // Exclude titles already watched in training history.
    const watchedTitleIds = new Set(
      userTrainingInteractions
        .filter((interaction) => interaction.title)
        .map((interaction) => normalizeId(interaction.title)),
    );

    // The held-out title remains among the candidates.
    const candidateTitles = publishedTitles.filter(
      (title) => !watchedTitleIds.has(normalizeId(title._id)),
    );

    const result = buildRecommendations({
      userId,
      userInteractions: userTrainingInteractions,
      allInteractions: trainingInteractions,
      candidateTitles,
      limit: TOP_K,
    });

    const recommendations = result.recommendations;

    const hitIndex = recommendations.findIndex(
      (title) => normalizeId(title._id) === relevantTitleId,
    );

    const isHit = hitIndex !== -1;

    if (isHit) {
      totalHits += 1;
    }

    evaluatedUsers += 1;

    console.log(`User: ${userId}`);
    console.log(`Relevant title: ${relevantTitle.name}`);

    console.log(
      `Recommended titles: ${
        recommendations.map((title) => title.name).join(", ") || "None"
      }`,
    );

    console.log(
      `Relevant title rank: ${isHit ? hitIndex + 1 : "Not found in Top 5"}`,
    );

    console.log(`Hit@5: ${isHit ? 1 : 0}`);
    console.log("--------------------------------------");
  }

  if (evaluatedUsers === 0) {
    throw new Error(
      "No users could be evaluated. Check published titles and interactions.",
    );
  }

  // Standard Precision@5:
  // Total relevant hits / (number of evaluated users * 5).
  const precisionAt5 = totalHits / (evaluatedUsers * TOP_K);

  console.log("\n======================================");
  console.log("          FINAL METRICS");
  console.log("======================================");

  console.log(`Evaluated users: ${evaluatedUsers}`);
  console.log(`Relevant hits in Top 5: ${totalHits}`);

  console.log(`Precision@5: ${(precisionAt5 * 100).toFixed(2)}%`);

  console.log(`PRD target: 60% (0.60)`);

  console.log(`Target achieved: ${precisionAt5 >= 0.6 ? "YES" : "NO"}`);

  console.log("======================================\n");
};

try {
  await evaluateRecommendations();
} catch (error) {
  console.error("\nEvaluation failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
