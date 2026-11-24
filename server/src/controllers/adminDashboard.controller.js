import { getAdminDashboardOverview } from "../services/adminDashboard.service.js";

export const getAdminDashboardOverviewController = async (req, res) => {
  try {
    const overview = await getAdminDashboardOverview();

    return res.status(200).json({
      success: true,
      message: "Admin dashboard overview fetched successfully",
      overview,
    });
  } catch (error) {
    console.error("Admin dashboard overview error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch admin dashboard overview",
    });
  }
};
