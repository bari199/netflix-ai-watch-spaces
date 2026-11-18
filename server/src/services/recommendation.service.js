import Interaction from "../models/Interaction.js";
import Title from "../models/Title.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

const CONTENT_WEIGHT = 0.55;
const COLLABORATIVE_WEIGHT = 0.35;
const POPULARITY_WEIGHT = 0.1;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const normalizeId = (id) => String(id?._id || id);

const tokenize = (value = "") => {
  return new Set(value.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || []);
};

const jaccardSimilarity = (first, second) => {
  if (!first.size || !second.size) return 0;

  let intersection = 0;

  for (const item of first) {
    if (second.has(item)) intersection += 1;
  }

  const union = first.size + second.size - intersection;

  return union === 0 ? 0 : intersection / union;
};

const getInteractionStrength = (interaction) => {
  const completion = clamp(Number(interaction.completionPercentage || 0) / 100);

  // Low ratings represent negative preference.
  // Content-based filtering handles these through negative history.
  if (typeof interaction.rating === "number" && interaction.rating <= 2) {
    return 0;
  }

  const rating =
    typeof interaction.rating === "number"
      ? clamp((interaction.rating - 1) / 4)
      : null;

  if (rating === null) {
    return completion;
  }

  return clamp(completion * 0.65 + rating * 0.35);
};

const getGenreSimilarity = (first, second) => {
  const firstGenres = new Set(
    (first.genre || []).map((genre) => genre.toLowerCase().trim()),
  );

  const secondGenres = new Set(
    (second.genre || []).map((genre) => genre.toLowerCase().trim()),
  );

  return jaccardSimilarity(firstGenres, secondGenres);
};

const getTextSimilarity = (first, second) => {
  const firstText = tokenize(`${first.name || ""} ${first.description || ""}`);

  const secondText = tokenize(
    `${second.name || ""} ${second.description || ""}`,
  );

  return jaccardSimilarity(firstText, secondText);
};

const getContentSimilarity = (first, second) => {
  const genreScore = getGenreSimilarity(first, second);
  const textScore = getTextSimilarity(first, second);

  return clamp(genreScore * 0.75 + textScore * 0.25);
};

const getContentScores = (userInteractions, candidateTitles) => {
  const positiveHistory = [];
  const negativeHistory = [];

  for (const interaction of userInteractions) {
    const title = interaction.title;

    if (!title || typeof title !== "object") continue;

    const rating = interaction.rating;

    const completion = clamp(
      Number(interaction.completionPercentage || 0) / 100,
    );

    // Ratings <= 2 are treated as negative preferences.
    if (typeof rating === "number" && rating <= 2) {
      negativeHistory.push({
        title,
        weight: Math.max(0.25, completion),
      });

      continue;
    }

    const weight = getInteractionStrength(interaction);

    if (weight > 0) {
      positiveHistory.push({
        title,
        weight,
      });
    }
  }

  const scores = new Map();

  for (const candidate of candidateTitles) {
    let positiveTotal = 0;
    let positiveWeight = 0;
    let negativeTotal = 0;
    let negativeWeight = 0;

    for (const item of positiveHistory) {
      const similarity = getContentSimilarity(item.title, candidate);

      positiveTotal += similarity * item.weight;
      positiveWeight += item.weight;
    }

    for (const item of negativeHistory) {
      const similarity = getContentSimilarity(item.title, candidate);

      negativeTotal += similarity * item.weight;
      negativeWeight += item.weight;
    }

    const positiveScore =
      positiveWeight > 0 ? positiveTotal / positiveWeight : 0;

    const negativeScore =
      negativeWeight > 0 ? negativeTotal / negativeWeight : 0;

    scores.set(
      normalizeId(candidate._id),
      clamp(positiveScore - negativeScore * 0.5),
    );
  }

  return scores;
};

const getCollaborativeScores = (
  currentUserId,
  userInteractions,
  allInteractions,
  candidateTitles,
) => {
  const userVectors = new Map();
  const interactionTotals = new Map();

  // Build user-title interaction strengths.
  // Average duplicate records instead of overwriting them.
  for (const interaction of allInteractions) {
    if (!interaction.user || !interaction.title) continue;

    const userId = normalizeId(interaction.user);
    const titleId = normalizeId(interaction.title);

    const strength = getInteractionStrength(interaction);

    if (!userVectors.has(userId)) {
      userVectors.set(userId, new Map());
    }

    const key = `${userId}:${titleId}`;

    const current = interactionTotals.get(key) || {
      total: 0,
      count: 0,
    };

    current.total += strength;
    current.count += 1;

    interactionTotals.set(key, current);
  }

  // Store averaged strengths in user vectors.
  for (const [key, value] of interactionTotals.entries()) {
    const separatorIndex = key.indexOf(":");

    const userId = key.slice(0, separatorIndex);
    const titleId = key.slice(separatorIndex + 1);

    userVectors.get(userId).set(titleId, value.total / value.count);
  }

  const currentUserKey = normalizeId(currentUserId);

  const currentVector = userVectors.get(currentUserKey);

  if (!currentVector || currentVector.size === 0) {
    return new Map();
  }

  // Calculate cosine similarity between two users.
  const getCosineSimilarity = (first, second) => {
    let dotProduct = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    for (const value of first.values()) {
      firstMagnitude += value * value;
    }

    for (const value of second.values()) {
      secondMagnitude += value * value;
    }

    for (const [titleId, value] of first.entries()) {
      dotProduct += value * (second.get(titleId) || 0);
    }

    if (!firstMagnitude || !secondMagnitude) {
      return 0;
    }

    return clamp(
      dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude)),
    );
  };

  // Find users with similar viewing preferences.
  const similarUsers = [];

  for (const [userId, vector] of userVectors.entries()) {
    if (userId === currentUserKey) continue;

    const similarity = getCosineSimilarity(currentVector, vector);

    if (similarity > 0.05) {
      similarUsers.push({
        vector,
        similarity,
      });
    }
  }

  // Calculate collaborative scores for candidate titles.
  const scores = new Map();

  for (const candidate of candidateTitles) {
    const candidateId = normalizeId(candidate._id);

    let weightedScore = 0;
    let totalSimilarity = 0;

    for (const similarUser of similarUsers) {
      const strength = similarUser.vector.get(candidateId) || 0;

      if (strength <= 0) continue;

      weightedScore += similarUser.similarity * strength;

      totalSimilarity += similarUser.similarity;
    }

    const collaborativeScore =
      totalSimilarity > 0 ? weightedScore / totalSimilarity : 0;

    scores.set(candidateId, clamp(collaborativeScore));
  }

  return scores;
};

const getPopularityScores = (candidateTitles, allInteractions) => {
  const popularity = new Map();

  for (const interaction of allInteractions) {
    const titleId = normalizeId(interaction.title);

    popularity.set(titleId, (popularity.get(titleId) || 0) + 1);
  }

  const maxCount = Math.max(
    1,
    ...candidateTitles.map(
      (title) => popularity.get(normalizeId(title._id)) || 0,
    ),
  );

  const scores = new Map();

  for (const title of candidateTitles) {
    const count = popularity.get(normalizeId(title._id)) || 0;

    scores.set(normalizeId(title._id), count / maxCount);
  }

  return scores;
};

// Shared recommendation builder.
// Used by production API and offline evaluation.
export const buildRecommendations = ({
  userId,
  userInteractions,
  allInteractions,
  candidateTitles,
  limit = DEFAULT_LIMIT,
}) => {
  const safeLimit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(limit) || DEFAULT_LIMIT),
  );

  if (!candidateTitles.length) {
    return {
      recommendations: [],
      count: 0,
      strategy: "hybrid",
    };
  }

  const contentScores = getContentScores(userInteractions, candidateTitles);

  const collaborativeScores = getCollaborativeScores(
    userId,
    userInteractions,
    allInteractions,
    candidateTitles,
  );

  const popularityScores = getPopularityScores(
    candidateTitles,
    allInteractions,
  );

  const hasHistory = userInteractions.some((interaction) => interaction.title);

  const recommendations = candidateTitles.map((title) => {
    const titleId = normalizeId(title._id);

    const contentScore = contentScores.get(titleId) || 0;

    const collaborativeScore = collaborativeScores.get(titleId) || 0;

    const popularityScore = popularityScores.get(titleId) || 0;

    const finalScore = hasHistory
      ? contentScore * CONTENT_WEIGHT +
        collaborativeScore * COLLABORATIVE_WEIGHT +
        popularityScore * POPULARITY_WEIGHT
      : popularityScore;

    return {
      ...title,

      recommendationScore: Number(finalScore.toFixed(4)),

      recommendationSignals: {
        content: Number(contentScore.toFixed(4)),
        collaborative: Number(collaborativeScore.toFixed(4)),
        popularity: Number(popularityScore.toFixed(4)),
      },
    };
  });

  recommendations.sort(
    (first, second) => second.recommendationScore - first.recommendationScore,
  );

  return {
    recommendations: recommendations.slice(0, safeLimit),
    count: Math.min(safeLimit, recommendations.length),
    strategy: hasHistory ? "hybrid" : "popularity",
  };
};

// Production recommendation service.
export const getRecommendations = async (userId, limit = DEFAULT_LIMIT) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const safeLimit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(limit) || DEFAULT_LIMIT),
  );

  // Load current user's interaction history.
  const userInteractions = await Interaction.find({
    user: userId,
  })
    .populate({
      path: "title",
      select: "name description genre releaseYear duration isPublished",
    })
    .sort({ lastWatchedAt: -1 })
    .lean();

  // Exclude all titles already present in user's interaction history.
  const watchedTitleIds = userInteractions.map((interaction) =>
    normalizeId(interaction.title?._id || interaction.title),
  );

  const candidateQuery = {
    isPublished: true,
  };

  if (watchedTitleIds.length > 0) {
    candidateQuery._id = {
      $nin: watchedTitleIds,
    };
  }

  const candidateTitles = await Title.find(candidateQuery)
    .select("name description genre releaseYear duration thumbnailKey")
    .lean();

  if (candidateTitles.length === 0) {
    return {
      recommendations: [],
      count: 0,
      strategy: "hybrid",
    };
  }

  // Load interaction data for collaborative filtering and popularity.
  const allInteractions = await Interaction.find({})
    .select("user title completionPercentage rating isCompleted")
    .lean();

  // Use the same recommendation logic as the offline evaluator.
  return buildRecommendations({
    userId,
    userInteractions,
    allInteractions,
    candidateTitles,
    limit: safeLimit,
  });
};
