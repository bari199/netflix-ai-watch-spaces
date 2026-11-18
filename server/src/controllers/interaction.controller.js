import { getRecentlyWatched } from "../services/interaction.service.js";

export const getRecentlyWatchedController = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;

    const recentlyWatched = await getRecentlyWatched(req.user.id, limit);

    return res.status(200).json({
      success: true,
      message: "Recently watched titles fetched successfully",
      count: recentlyWatched.length,
      recentlyWatched,
    });
  } catch (error) {
    next(error);
  }
};
