import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  ShieldCheck,
  Settings,
  History,
  ChevronRight,
  Mail,
  CalendarDays,
  LogOut,
  CircleCheck,
  Camera,
  Save,
  LoaderCircle,
  ArrowLeft,
  KeyRound,
  Video,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import { forgotPassword, resetPassword } from "../services/auth.service.js";
import PastWatchSpaces from "../components/watchspace/PastWatchSpaces.jsx";
import MyCreatedWatchSpaces from "../components/profile/MyCreatedWatchSpaces.jsx";

const menuItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "history", label: "Watch History", icon: History },
  { id: "my-watch-spaces", label: "My Watch Spaces", icon: Video },
];

function MyProfilePage() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Profile states
  const [name, setName] = useState(user?.name || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [serverAvatar, setServerAvatar] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Password reset states
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  const activeItem = menuItems.find((item) => item.id === activeTab);
  const ActiveIcon = activeItem?.icon;

  // Keep profile name synchronized with AuthContext
  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  // Load protected avatar from backend
  useEffect(() => {
    let objectUrl;

    const loadAvatar = async () => {
      if (!user?.avatar) {
        setServerAvatar("");
        return;
      }

      try {
        const response = await api.get("/users/me/avatar", {
          responseType: "blob",
        });

        objectUrl = URL.createObjectURL(response.data);
        setServerAvatar(objectUrl);
      } catch (err) {
        console.error("Avatar loading failed:", err);
        setServerAvatar("");
      }
    };

    loadAvatar();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [user?.avatar]);

  // Generate preview for newly selected avatar
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  const displayedAvatar = avatarPreview || serverAvatar;

  // ==========================================
  // Profile: Avatar Change
  // ==========================================

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");
    setError("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
  };

  // ==========================================
  // Profile: Save Changes
  // ==========================================

  const handleProfileSave = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let updatedUser = { ...user };

      // Update profile name
      if (name.trim() !== user?.name) {
        const response = await api.patch("/users/me", {
          name: name.trim(),
        });

        updatedUser = {
          ...updatedUser,
          ...response.data.user,
        };
      }

      // Upload avatar
      if (avatarFile) {
        const formData = new FormData();

        formData.append("avatar", avatarFile);

        const response = await api.patch("/users/me/avatar", formData);

        updatedUser = {
          ...updatedUser,
          ...response.data.user,
        };

        setAvatarFile(null);
      }

      setUser(updatedUser);

      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // Settings: Send Password Reset OTP
  // ==========================================

  const handleSendResetOtp = async () => {
    setOtpError("");
    setOtpMessage("");

    if (!user?.email) {
      setOtpError("Registered email address is not available.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await forgotPassword(user.email);

      setOtpSent(true);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setOtpMessage(
        response.message || "Password reset OTP sent to your email.",
      );
    } catch (err) {
      setOtpError(
        err.response?.data?.message || "Failed to send OTP. Please try again.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ==========================================
  // Settings: Verify OTP and Reset Password
  // ==========================================

  const handleResetPassword = async (event) => {
    event.preventDefault();

    setOtpError("");
    setOtpMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (newPassword.length < 8) {
      setOtpError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setOtpError("Passwords do not match.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await resetPassword({
        email: user.email,
        otp,
        password: newPassword,
      });

      setOtpMessage(
        response.message ||
          "Password reset successfully. Please sign in again.",
      );

      setOtpSent(false);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setOtpError(
        err.response?.data?.message ||
          "Password reset failed. Please check your OTP.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ==========================================
  // Settings: Reset Form
  // ==========================================

  const handleCancelOtp = () => {
    setOtpSent(false);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpError("");
    setOtpMessage("");
  };

  // ==========================================
  // Logout
  // ==========================================

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // ==========================================
  // Overview
  // ==========================================

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/40 to-[#18181b] p-6">
        <p className="text-sm text-red-400">Welcome back!</p>

        <h3 className="mt-2 text-2xl font-bold">{user?.name || "User"}</h3>

        <p className="mt-2 text-sm text-zinc-400">
          Your Netflix AI Watch Spaces account is ready.
        </p>
      </div>

      <div>
        <h3 className="mb-4 font-semibold">Account Information</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            icon={UserRound}
            label="Full Name"
            value={user?.name || "Not available"}
          />

          <InfoCard
            icon={Mail}
            label="Email Address"
            value={user?.email || "Not available"}
          />

          <InfoCard
            icon={ShieldCheck}
            label="Email Verification"
            value={user?.isEmailVerified ? "Verified" : "Not Verified"}
            verified={user?.isEmailVerified}
          />

          <InfoCard
            icon={CalendarDays}
            label="Account Created"
            value={
              user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "Not available"
            }
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-semibold">Quick Access</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {menuItems.slice(1).map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMessage("");
                  setError("");
                  setOtpError("");
                  setOtpMessage("");
                }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-red-500/40 hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} className="text-red-400" />
                  <span className="text-sm font-medium">{item.label}</span>
                </span>

                <ChevronRight size={17} className="text-zinc-500" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // My Profile
  // ==========================================

  const renderProfile = () => (
    <form onSubmit={handleProfileSave} className="space-y-7">
      <div>
        <h3 className="font-semibold">Profile Picture</h3>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-red-500/40 bg-gradient-to-br from-red-500 to-red-900 text-3xl font-bold">
            {displayedAvatar ? (
              <img
                src={displayedAvatar}
                alt="Profile avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>

          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium transition hover:bg-white/10">
              <Camera size={17} />
              Change Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>

            <p className="mt-2 text-xs text-zinc-500">
              JPG, PNG or WEBP. Maximum 5 MB.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="mb-5 font-semibold">Personal Information</h3>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="profileName"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Full Name
            </label>

            <input
              id="profileName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label
              htmlFor="profileEmail"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Email Address
            </label>

            <input
              id="profileEmail"
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-500"
            />

            <p className="mt-2 text-xs text-zinc-500">
              Email address cannot be changed here.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
        <button
          type="submit"
          disabled={saving || (!avatarFile && name.trim() === user?.name)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#e50914] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}

          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={() => {
            setName(user?.name || "");
            setAvatarFile(null);
            setError("");
            setMessage("");
          }}
          className="rounded-lg border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  // ==========================================
  // Settings: Password Reset
  // ==========================================

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <KeyRound size={22} />
          </div>

          <div>
            <h3 className="font-semibold text-white">Reset Password</h3>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Secure your account by resetting your password using a one-time
              verification code sent to your registered email.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Registered Email Address
          </label>

          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-500"
          />

          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendResetOtp}
              disabled={otpLoading}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#e50914] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {otpLoading ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Mail size={17} />
              )}

              {otpLoading ? "Sending OTP..." : "Send Password Reset OTP"}
            </button>
          ) : (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-5">
              <div>
                <h4 className="font-semibold text-white">Verify Your Email</h4>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Enter the 6-digit OTP sent to your registered email. The OTP
                  expires in 10 minutes.
                </p>
              </div>

              <div>
                <label
                  htmlFor="settingsOtp"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  6-Digit OTP
                </label>

                <input
                  id="settingsOtp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter OTP"
                  required
                  disabled={otpLoading}
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none transition placeholder:text-sm placeholder:tracking-normal placeholder:text-zinc-500 focus:border-red-500"
                />
              </div>

              <div>
                <label
                  htmlFor="settingsNewPassword"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  New Password
                </label>

                <input
                  id="settingsNewPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                  minLength={8}
                  required
                  disabled={otpLoading}
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Minimum 8 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="settingsConfirmPassword"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Confirm New Password
                </label>

                <input
                  id="settingsConfirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                  disabled={otpLoading}
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#e50914] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {otpLoading && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}

                  {otpLoading ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelOtp}
                  disabled={otpLoading}
                  className="rounded-lg border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendResetOtp}
                disabled={otpLoading}
                className="text-sm font-medium text-red-400 transition hover:text-red-300 hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            </form>
          )}

          {otpError && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {otpError}
            </p>
          )}

          {otpMessage && (
            <p
              role="status"
              className="mt-5 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400"
            >
              {otpMessage}
            </p>
          )}
        </div>
      </div>

      {/* Account Security Information */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={19} className="text-green-500" />

          <h3 className="text-sm font-semibold">Account Security</h3>
        </div>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Never share your password or OTP with anyone. Your OTP is valid for 10
          minutes and has a maximum of 5 verification attempts.
        </p>
      </div>
    </div>
  );

  // ==========================================
  // Placeholder: Security and Watch History
  // ==========================================

  const renderPlaceholder = () => {
    const descriptions = {
      security:
        "Password management and account security will be implemented here.",
      history:
        "Your previous Watch Spaces and viewing activity will appear here.",
    };

    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        {ActiveIcon && <ActiveIcon size={42} className="mb-4 text-red-500" />}

        <h3 className="text-lg font-semibold">{activeItem?.label}</h3>

        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
          {descriptions[activeTab]}
        </p>
      </div>
    );
  };

  // ==========================================
  // Main UI
  // ==========================================

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#111113]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <NavLink
            to="/"
            className="text-2xl font-black tracking-tight text-[#e50914]"
          >
            NETFLIX
            <span className="ml-2 text-[10px] font-bold tracking-[2px] text-zinc-400">
              AI WATCH SPACES
            </span>
          </NavLink>

          <NavLink
            to="/"
            className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Home
          </NavLink>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Account
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Manage your profile, security and watch history.
          </p>
        </div>

        <div
          className={`grid min-w-0 items-start gap-4 sm:gap-6 ${
            sidebarCollapsed
              ? "lg:grid-cols-[88px_minmax(0,1fr)]"
              : "lg:grid-cols-[260px_minmax(0,1fr)]"
          }`}
        >
          {/* Responsive, collapsible sidebar */}
          <aside
            className={`sticky top-4 z-20 h-fit min-w-0 rounded-2xl border border-white/10 bg-[#111113] p-3 shadow-xl transition-[width] duration-300 sm:p-4 ${
              sidebarCollapsed ? "lg:w-[88px]" : "lg:w-full"
            }`}
          >
            {/* Profile identity */}
            <div
              className={`mb-3 flex items-center gap-3 border-b border-white/10 px-1 pb-4 ${
                sidebarCollapsed ? "lg:justify-center lg:px-0" : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-gradient-to-br from-red-500 to-red-900 text-lg font-bold">
                {displayedAvatar ? (
                  <img
                    src={displayedAvatar}
                    alt="Profile avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>

              <div
                className={`min-w-0 flex-1 ${
                  sidebarCollapsed ? "lg:hidden" : ""
                }`}
              >
                <h2 className="truncate text-sm font-semibold text-white">
                  {user?.name || "User"}
                </h2>
                <p className="truncate text-xs text-zinc-500">
                  {user?.email || "No email available"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-pressed={sidebarCollapsed}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="ml-auto hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white lg:inline-flex"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen size={18} />
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </button>
            </div>

            {/* Mobile: horizontally scrollable navigation. Desktop: vertical sidebar. */}
            <nav
              aria-label="Account navigation"
              className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] lg:flex-col lg:overflow-visible lg:pb-0"
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div key={item.id} className="group relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMessage("");
                        setError("");
                        setOtpError("");
                        setOtpMessage("");
                      }}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={item.label}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                        sidebarCollapsed
                          ? "lg:justify-center lg:px-0"
                          : ""
                      } ${
                        isActive
                          ? "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                          : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <Icon size={19} className="shrink-0" />
                      <span
                        className={`whitespace-nowrap ${
                          sidebarCollapsed ? "lg:hidden" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <ChevronRight
                          size={16}
                          className={`ml-auto hidden shrink-0 lg:block ${
                            sidebarCollapsed ? "lg:hidden" : ""
                          }`}
                        />
                      )}
                    </button>

                    {/* Tooltip appears only in collapsed desktop mode */}
                    {sidebarCollapsed && (
                      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#222225] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100 lg:block">
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title={sidebarCollapsed ? "Sign Out" : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                  sidebarCollapsed ? "lg:justify-center lg:px-0" : ""
                }`}
              >
                <LogOut size={19} className="shrink-0" />
                <span className={sidebarCollapsed ? "lg:hidden" : ""}>
                  Sign Out
                </span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111113] p-4 sm:p-6 lg:p-7">
            <div className="mb-7 border-b border-white/10 pb-5">
              <h2 className="text-xl font-bold">{activeItem?.label}</h2>

              <p className="mt-1 text-sm text-zinc-500">
                {activeTab === "overview"
                  ? "Here is an overview of your account."
                  : `Manage your ${activeItem?.label.toLowerCase()} information.`}
              </p>
            </div>

            {activeTab === "overview" && renderOverview()}

            {activeTab === "profile" && renderProfile()}

            {activeTab === "settings" && renderSettings()}

            {activeTab === "my-watch-spaces" && <MyCreatedWatchSpaces />}

            {activeTab === "history" && <PastWatchSpaces />}
          </section>
        </div>
      </div>
    </main>
  );
}

// ==========================================
// Reusable Info Card
// ==========================================

function InfoCard({ icon: Icon, label, value, verified }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-zinc-500">
        <Icon size={17} />
        <span className="text-xs">{label}</span>
      </div>

      <p className="flex items-center gap-2 break-words font-medium">
        {verified !== undefined &&
          (verified ? (
            <CircleCheck size={16} className="shrink-0 text-green-500" />
          ) : (
            <span className="text-yellow-500">!</span>
          ))}

        {value}
      </p>
    </div>
  );
}

export default MyProfilePage;
