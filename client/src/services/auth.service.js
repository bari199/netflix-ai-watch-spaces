import api, { setAccessToken, clearAccessToken } from "../api/axios.js";

// ==========================================
// Register
// ==========================================

export const registerUser = async (userData) => {
  const formData = new FormData();

  formData.append("name", userData.name);
  formData.append("email", userData.email);
  formData.append("password", userData.password);

  if (userData.avatar) {
    formData.append("avatar", userData.avatar);
  }

  const response = await api.post("/auth/register", formData);
  return response.data;
};

// ==========================================
// Login
// ==========================================

export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);

  setAccessToken(response.data.accessToken);

  return response.data;
};

// ==========================================
// Session
// ==========================================

export const refreshSession = async () => {
  const response = await api.post("/auth/refresh");

  setAccessToken(response.data.accessToken);

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/users/me");
  return response.data;
};

// ==========================================
// Forgot Password - Request OTP
// ==========================================

export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });

  return response.data;
};

// ==========================================
// Reset Password - Verify OTP
// ==========================================

export const resetPassword = async ({ email, otp, password }) => {
  const response = await api.post("/auth/reset-password", {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
    password,
  });

  return response.data;
};

// ==========================================
// Change Password
// ==========================================

export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.patch("/auth/change-password", {
    currentPassword,
    newPassword,
  });

  return response.data;
};

// ==========================================
// Logout
// ==========================================

export const logoutUser = async () => {
  try {
    const response = await api.post("/auth/logout");
    return response.data;
  } finally {
    clearAccessToken();
  }
};

// ==========================================
// Email Verification
// ==========================================

export const verifyEmail = async (email, token) => {
  const response = await api.get("/auth/verify-email", {
    params: { email, token },
  });

  return response.data;
};

// ==========================================
// Admin Login
// ==========================================

export const adminLoginUser = async (credentials) => {
  const response = await api.post("/auth/admin/login", credentials);

  setAccessToken(response.data.accessToken);

  return response.data;
};
