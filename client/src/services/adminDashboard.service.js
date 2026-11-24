import api from "../api/axios.js";

export const getAdminDashboardOverview = async () => {
  const response = await api.get("/admin/dashboard/overview");
  return response.data;
};
