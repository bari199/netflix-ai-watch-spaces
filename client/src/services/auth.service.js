import api, { setAccessToken, clearAccessToken } from "../api/axios.js";

export const registerUser = async (userData) => {
  const formData = new FormData();

  formData.append("name", userData.name);
  formData.append("email", userData.email);
  formData.append("password", userData.password);

  if (userData.avatar) {
    formData.append("avatar", userData.avatar);
  }

  // Temporary debugging
  console.log("Selected avatar:", userData.avatar);
  console.log("FormData entries:");

  for (const [key, value] of formData.entries()) {
    console.log(
      key,
      value instanceof File
        ? {
            name: value.name,
            type: value.type,
            size: value.size,
          }
        : value,
    );
  }

  const response = await api.post("/auth/register", formData);

  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);

  setAccessToken(response.data.accessToken);

  return response.data;
};

export const refreshSession = async () => {
  const response = await api.post("/auth/refresh");

  setAccessToken(response.data.accessToken);

  return response.data;
};

export const logoutUser = async () => {
  try {
    const response = await api.post("/auth/logout");
    return response.data;
  } finally {
    clearAccessToken();
  }
};

export const verifyEmail = async (email, token) => {
  const response = await api.get("/auth/verify-email", {
    params: { email, token },
  });

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/users/me");
  return response.data;
};
