import api from "../api/axios.js";

const getRecommendations = async (limit = 5) => {
  const response = await api.get("/recommendations", {
    params: { limit },
  });

  return response.data;
};

export default {
  getRecommendations,
};
