import { getWatchSpaceAnalytics } from "../services/analytics.service.js";

export const getWatchSpaceAnalyticsController = async (req, res) => {
  try {
    const analytics = await getWatchSpaceAnalytics(
      req.params.watchSpaceId,
      req.user._id,
    );

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Analytics API Error:", error.message);

    if (
      error.name === "CastError" ||
      error.message === "Invalid WatchSpace ID"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "WatchSpace not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Only the WatchSpace host can access analytics") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
