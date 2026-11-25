import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  LayoutDashboard,
  UserRound,
  Settings,
  History,
  Video,
  ChevronRight,
  Mail,
  MailCheck,
  CalendarDays,
  LogOut,
  CircleCheck,
  CircleAlert,
  Camera,
  Save,
  LoaderCircle,
  ArrowLeft,
  KeyRound,
  Volume2,
  Vibrate,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  VolumeX,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import { forgotPassword, resetPassword } from "../services/auth.service.js";
import PastWatchSpaces from "../components/watchspace/PastWatchSpaces.jsx";
import MyCreatedWatchSpaces from "../components/profile/MyCreatedWatchSpaces.jsx";

// ==========================================
// Config
// ==========================================

// Single source of truth for navigation, tab titles and captions.
const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    description: "Your account at a glance.",
    icon: LayoutDashboard,
  },
  {
    id: "profile",
    label: "My Profile",
    description: "Update your name and photo.",
    icon: UserRound,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Manage how you sign in.",
    icon: Settings,
  },
  {
    id: "history",
    label: "Watch History",
    description: "Your past Watch Spaces.",
    icon: History,
  },
  {
    id: "my-watch-spaces",
    label: "My Watch Spaces",
    description: "Spaces you created.",
    icon: Video,
  },
];

const SIDEBAR_WIDTH = { expanded: 232, collapsed: 72 };

// ==========================================
// Hooks
// ==========================================

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    setMatches(mql.matches);
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// ==========================================
// Reusable UI (shadcn + Netflix theme)
// ==========================================

const buttonVariants = {
  primary:
    "bg-[#e50914] text-white hover:bg-[#f6121d] focus-visible:ring-[#e50914]/40",
  outline:
    "border border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white",
  ghost: "bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white",
  link: "h-auto bg-transparent p-0 text-zinc-400 hover:bg-transparent hover:text-white hover:underline",
};

/** shadcn Button with the Netflix look. Add new variants in `buttonVariants`. */
function NetflixButton({
  variant = "primary",
  icon: Icon,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(
        "h-10 gap-2 rounded-md px-5 text-sm font-semibold shadow-none transition-all active:scale-[0.98]",
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : (
        Icon && <Icon size={16} />
      )}
      {children}
    </Button>
  );
}

/** Netflix-style input: dark fill, label floats up on focus / when filled. */
function FloatingField({
  id,
  label,
  hint,
  type = "text",
  className,
  inputClassName,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={className}>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          {...props}
          placeholder=" "
          className={cn(
            "peer h-12 rounded-md border-0 bg-[#333] px-4 pb-1 pt-5 text-sm text-white shadow-none",
            "focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:opacity-70",
            isPassword && "pr-11",
            inputClassName,
          )}
        />

        <Label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-normal text-zinc-400 transition-all duration-150",
            "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px]",
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]",
          )}
        >
          {label}
        </Label>

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {hint && <p className="mt-1.5 px-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function StatusMessage({ type = "success", children }) {
  const isError = type === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <motion.div
      role={isError ? "alert" : "status"}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "flex items-start gap-2 rounded-md px-3 py-2.5 text-sm",
        isError
          ? "bg-[#e87c03]/10 text-[#f5a04a]"
          : "bg-green-500/10 text-green-400",
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </motion.div>
  );
}

function UserAvatar({ src, name, className }) {
  return (
    <Avatar className={cn("border border-white/10", className)}>
      <AvatarImage
        src={src || undefined}
        alt="Profile avatar"
        className="object-cover"
      />
      <AvatarFallback className="bg-gradient-to-br from-[#e50914] to-[#7a0510] font-semibold text-white">
        {name?.charAt(0)?.toUpperCase() || "U"}
      </AvatarFallback>
    </Avatar>
  );
}

function InfoCard({ icon: Icon, label, value, verified }) {
  return (
    <Card className="gap-0 rounded-lg border-white/10 bg-white/[0.03] py-0 text-white shadow-none">
      <CardContent className="p-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-zinc-500">
          <Icon size={15} />
          <span className="text-xs">{label}</span>
        </div>

        <p
          title={typeof value === "string" ? value : undefined}
          className="flex items-center gap-1.5 truncate text-sm font-medium"
        >
          {verified !== undefined &&
            (verified ? (
              <CircleCheck size={15} className="shrink-0 text-green-500" />
            ) : (
              <CircleAlert size={15} className="shrink-0 text-yellow-500" />
            ))}
          <span className="truncate">{value}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function QuickLink({ icon: Icon, label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]/60"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e50914]/10 text-[#e50914]">
        <Icon size={17} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-zinc-500">
          {description}
        </span>
      </span>

      <ChevronRight
        size={16}
        className="shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300"
      />
    </button>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active = false,
  compact = false,
  danger = false,
  onClick,
}) {
  const item = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 shrink-0 items-center rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#e50914]/60",
        compact ? "w-full justify-center" : "gap-3 px-3",
        danger
          ? "text-[#ff5a63] hover:bg-[#e50914]/10"
          : active
            ? "text-white"
            : "text-zinc-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute inset-0 rounded-md bg-white/10"
        >
          <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-[#e50914] lg:block" />
        </motion.span>
      )}

      <Icon
        size={18}
        className={cn("relative shrink-0", active && "text-[#e50914]")}
      />

      <AnimatePresence initial={false}>
        {!compact && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            className="relative overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  // Tooltips only matter when the label is hidden.
  if (!compact) return item;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={12}
        className="border border-white/10 bg-[#262626] text-xs text-white [&>span]:hidden"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ==========================================
// Page
// ==========================================

function MyProfilePage() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // WatchSpace notification preferences are persisted on the user account.
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

  // Persistent Watch Space notification preferences
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  const avatarInputRef = useRef(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const compact = isDesktop && sidebarCollapsed;

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const firstName = user?.name?.trim().split(" ")[0];
  const activeDescription =
    activeTab === "overview" && firstName
      ? `Welcome back, ${firstName}.`
      : activeItem?.description;

  // Keep profile name synchronized with AuthContext
  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  // Load protected avatar from backend
  useEffect(() => {
    let active = true;
    let objectUrl;

    setServerAvatar("");

    const loadAvatar = async () => {
      if (!user?._id || !user?.avatar) return;

      try {
        const response = await api.get("/users/me/avatar", {
          responseType: "blob",
        });

        if (!active) return;

        objectUrl = URL.createObjectURL(response.data);
        setServerAvatar(objectUrl);
      } catch (err) {
        if (active) {
          console.error("Avatar loading failed:", err);
          setServerAvatar("");
        }
      }
    };

    loadAvatar();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?._id, user?.avatar]);

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
  // Navigation
  // ==========================================

  const handleTabChange = (id) => {
    setActiveTab(id);
    setMessage("");
    setError("");
    setOtpError("");
    setOtpMessage("");
  };

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
  // Profile: Cancel
  // ==========================================

  const handleCancelProfile = () => {
    setName(user?.name || "");
    setAvatarFile(null);
    setError("");
    setMessage("");
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={UserRound}
          label="Full name"
          value={user?.name || "Not available"}
        />

        <InfoCard
          icon={Mail}
          label="Email"
          value={user?.email || "Not available"}
        />

        <InfoCard
          icon={MailCheck}
          label="Email status"
          value={user?.isEmailVerified ? "Verified" : "Not verified"}
          verified={user?.isEmailVerified}
        />

        <InfoCard
          icon={CalendarDays}
          label="Member since"
          value={
            user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "Not available"
          }
        />
      </div>

      <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
        {NAV_ITEMS.slice(1).map((item) => (
          <QuickLink
            key={item.id}
            icon={item.icon}
            label={item.label}
            description={item.description}
            onClick={() => handleTabChange(item.id)}
          />
        ))}
      </div>
    </div>
  );

  // ==========================================
  // My Profile
  // ==========================================

  const renderProfile = () => (
    <form onSubmit={handleProfileSave} className="max-w-md space-y-5">
      <div className="flex items-center gap-4">
        <UserAvatar
          src={displayedAvatar}
          name={user?.name}
          className="size-16 text-xl"
        />

        <div>
          <NetflixButton
            type="button"
            variant="outline"
            icon={Camera}
            className="h-9 px-3.5"
            onClick={() => avatarInputRef.current?.click()}
          >
            Change photo
          </NetflixButton>

          <p className="mt-1.5 text-xs text-zinc-500">
            JPG, PNG or WEBP, up to 5 MB.
          </p>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-3">
        <FloatingField
          id="profileName"
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={60}
        />

        <FloatingField
          id="profileEmail"
          label="Email"
          type="email"
          value={user?.email || ""}
          disabled
          hint="Email can't be changed here."
        />
      </div>

      {error && <StatusMessage type="error">{error}</StatusMessage>}
      {message && <StatusMessage>{message}</StatusMessage>}

      <div className="flex flex-wrap gap-3">
        <NetflixButton
          type="submit"
          icon={Save}
          loading={saving}
          disabled={!avatarFile && name.trim() === user?.name}
        >
          {saving ? "Saving..." : "Save changes"}
        </NetflixButton>

        <NetflixButton
          type="button"
          variant="ghost"
          onClick={handleCancelProfile}
        >
          Cancel
        </NetflixButton>
      </div>
    </form>
  );

  // ==========================================
  // Settings: Password Reset
  // ==========================================

  const handleNotificationPreferenceChange = async (key, enabled) => {
    const currentPreferences = {
      soundEnabled: user?.notificationPreferences?.soundEnabled ?? true,
      vibrationEnabled: user?.notificationPreferences?.vibrationEnabled ?? true,
    };
    const nextPreferences = { ...currentPreferences, [key]: enabled };

    setNotificationSaving(true);
    setNotificationError("");
    setNotificationMessage("");

    try {
      const response = await api.patch("/users/me", {
        notificationPreferences: nextPreferences,
      });
      const updatedUser = response?.data?.user ?? response?.data;

      setUser((previousUser) => ({
        ...previousUser,
        ...updatedUser,
        notificationPreferences:
          updatedUser?.notificationPreferences ?? nextPreferences,
      }));
      setNotificationMessage("Notification preferences saved.");
    } catch (err) {
      setNotificationError(
        err?.response?.data?.message ||
          "Could not save notification preferences. Please try again.",
      );
    } finally {
      setNotificationSaving(false);
    }
  };

  const notificationPreferences = {
    soundEnabled: user?.notificationPreferences?.soundEnabled ?? true,
    vibrationEnabled: user?.notificationPreferences?.vibrationEnabled ?? true,
  };

  const renderSettings = () => (
    <div className="max-w-md space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Playback preferences</h3>
          <p className="mt-0.5 text-xs leading-5 text-zinc-400">
            Control optional sound and vibration feedback in Watch Spaces.
          </p>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <span className="flex items-center gap-3">
            <Volume2 size={18} className="text-zinc-400" />
            <span>
              <span className="block text-sm font-medium">Sound effects</span>
              <span className="block text-xs text-zinc-500">
                Enable interface sound feedback
              </span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={notificationPreferences.soundEnabled}
            onChange={(event) =>
              handleNotificationPreferenceChange(
                "soundEnabled",
                event.target.checked,
              )
            }
            disabled={notificationSaving}
            className="size-4 accent-[#e50914] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <span className="flex items-center gap-3">
            <Vibrate size={18} className="text-zinc-400" />
            <span>
              <span className="block text-sm font-medium">
                Vibration feedback
              </span>
              <span className="block text-xs text-zinc-500">
                Enable vibration where supported
              </span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={notificationPreferences.vibrationEnabled}
            onChange={(event) =>
              handleNotificationPreferenceChange(
                "vibrationEnabled",
                event.target.checked,
              )
            }
            disabled={notificationSaving}
            className="size-4 accent-[#e50914] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        {notificationError && (
          <StatusMessage type="error">{notificationError}</StatusMessage>
        )}
        {notificationMessage && (
          <StatusMessage>{notificationMessage}</StatusMessage>
        )}
      </section>

      <div className="border-t border-white/10 pt-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e50914]/10 text-[#e50914]">
            <KeyRound size={17} />
          </span>

          <div>
            <h3 className="text-sm font-semibold">Reset password</h3>
            <p className="mt-0.5 text-xs leading-5 text-zinc-400">
              We&apos;ll email a 6-digit code to confirm it&apos;s you.
            </p>
          </div>
        </div>

        <FloatingField
          id="settingsEmail"
          label="Email"
          type="email"
          value={user?.email || ""}
          disabled
        />

        {!otpSent ? (
          <NetflixButton
            type="button"
            icon={Mail}
            loading={otpLoading}
            onClick={handleSendResetOtp}
          >
            {otpLoading ? "Sending OTP..." : "Send OTP"}
          </NetflixButton>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3">
            <FloatingField
              id="settingsOtp"
              label="6-digit code"
              hint="Expires in 10 minutes."
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              disabled={otpLoading}
              inputClassName="font-medium tracking-[0.3em]"
            />

            <FloatingField
              id="settingsNewPassword"
              label="New password"
              type="password"
              hint="At least 8 characters."
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              disabled={otpLoading}
            />

            <FloatingField
              id="settingsConfirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              disabled={otpLoading}
            />

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <NetflixButton type="submit" loading={otpLoading}>
                {otpLoading ? "Resetting..." : "Reset password"}
              </NetflixButton>

              <NetflixButton
                type="button"
                variant="ghost"
                onClick={handleCancelOtp}
                disabled={otpLoading}
              >
                Cancel
              </NetflixButton>

              <NetflixButton
                type="button"
                variant="link"
                onClick={handleSendResetOtp}
                disabled={otpLoading}
                className="ml-auto"
              >
                Resend OTP
              </NetflixButton>
            </div>
          </form>
        )}

        {otpError && <StatusMessage type="error">{otpError}</StatusMessage>}
        {otpMessage && <StatusMessage>{otpMessage}</StatusMessage>}
      </div>
    </div>
  );

  // ==========================================
  // Main UI
  // ==========================================

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={120}>
        <main className="min-h-screen bg-[#141414] text-white">
          {/* Header */}
          <header className="relative z-30 border-b border-white/10 bg-[#141414]">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
              <NavLink
                to="/"
                className="text-xl font-black tracking-tight text-[#e50914]"
              >
                NETFLIX
                <span className="ml-2 text-[10px] font-bold tracking-[2px] text-zinc-500">
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

          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            {/* One attached shell: sidebar + content share a single border */}
            <div className="relative z-0 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1b1b1b] lg:flex-row">
              {/* Collapsible sidebar */}
              <motion.aside
                initial={false}
                animate={{
                  width: isDesktop
                    ? compact
                      ? SIDEBAR_WIDTH.collapsed
                      : SIDEBAR_WIDTH.expanded
                    : "100%",
                }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="relative z-20 flex shrink-0 flex-col overflow-hidden border-b border-white/10 bg-[#161616] p-2 lg:border-b-0 lg:border-r"
              >
                <div
                  className={cn(
                    "flex items-center border-b border-white/10 pb-3",
                    compact ? "flex-col gap-2" : "gap-3 px-1",
                  )}
                >
                  <UserAvatar
                    src={displayedAvatar}
                    name={user?.name}
                    className="size-10 shrink-0"
                  />

                  {!compact && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {user?.name || "User"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {user?.email || "No email available"}
                      </p>
                    </div>
                  )}

                  {isDesktop && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() =>
                            setSidebarCollapsed((current) => !current)
                          }
                          aria-label={
                            sidebarCollapsed
                              ? "Expand sidebar"
                              : "Collapse sidebar"
                          }
                          aria-pressed={sidebarCollapsed}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]/60"
                        >
                          {sidebarCollapsed ? (
                            <PanelLeftOpen size={17} />
                          ) : (
                            <PanelLeftClose size={17} />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side={compact ? "right" : "bottom"}
                        sideOffset={compact ? 12 : 6}
                        className="border border-white/10 bg-[#262626] text-xs text-white [&>span]:hidden"
                      >
                        {sidebarCollapsed
                          ? "Expand sidebar"
                          : "Collapse sidebar"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <nav
                  aria-label="Account navigation"
                  className={cn(
                    "my-2 flex gap-1",
                    isDesktop ? "flex-col" : "overflow-x-auto pb-1",
                  )}
                >
                  {NAV_ITEMS.map((item) => (
                    <SidebarItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={activeTab === item.id}
                      compact={compact}
                      onClick={() => handleTabChange(item.id)}
                    />
                  ))}
                </nav>

                <div className="mt-auto border-t border-white/10 pt-2">
                  <SidebarItem
                    icon={LogOut}
                    label="Sign out"
                    compact={compact}
                    danger
                    onClick={handleLogout}
                  />
                </div>
              </motion.aside>

              {/* Main content */}
              <section className="relative z-10 min-h-[420px] min-w-0 flex-1 p-4 sm:p-6">
                <div className="mb-5 border-b border-white/10 pb-4">
                  <h1 className="text-lg font-semibold tracking-tight">
                    {activeItem?.label}
                  </h1>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {activeDescription}
                  </p>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {activeTab === "overview" && renderOverview()}

                    {activeTab === "profile" && renderProfile()}

                    {activeTab === "settings" && renderSettings()}

                    {activeTab === "my-watch-spaces" && (
                      <MyCreatedWatchSpaces />
                    )}

                    {activeTab === "history" && <PastWatchSpaces />}
                  </motion.div>
                </AnimatePresence>
              </section>
            </div>
          </div>
        </main>
      </TooltipProvider>
    </MotionConfig>
  );
}

export default MyProfilePage;
