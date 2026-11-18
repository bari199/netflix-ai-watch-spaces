import { getRecommendations } from "../services/recommendation.service.js";

export const getRecommendationsController = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const limit = Number(req.query.limit) || 5;

    const result = await getRecommendations(userId, limit);

    return res.status(200).json({
      success: true,
      message: "Recommendations fetched successfully",
      ...result,
    });
  } catch (error) {
    console.error("Recommendation API Error:", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to fetch recommendations",
    });
  }
};
