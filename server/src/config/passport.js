import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

import User from "../models/User.js";
import { uploadAvatarFromUrl } from "../services/avatar.service.js";

// ==========================================
// Helper: Upload provider avatar to MinIO
// ==========================================

const getMinIOAvatar = async (photoUrl, provider) => {
  if (!photoUrl) return "";

  try {
    return await uploadAvatarFromUrl(photoUrl, provider);
  } catch (error) {
    // Avatar failure should not prevent OAuth login.
    console.error(`${provider} avatar upload failed:`, error.message);

    return "";
  }
};

// ==========================================
// Helper: Normalize Email
// ==========================================

const normalizeEmail = (email) => {
  return email?.toLowerCase().trim() || "";
};

// ==========================================
// Google OAuth Strategy
// ==========================================

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;

        const email = normalizeEmail(profile.emails?.[0]?.value);

        if (!email) {
          return done(null, false, {
            message: "Google account email is unavailable.",
          });
        }

        let user = await User.findOne({
          $or: [{ googleId }, { email }],
        });

        if (user) {
          // Prevent automatic linking with local accounts.
          if (user.authProvider === "local" && !user.googleId) {
            return done(null, false, {
              message:
                "An account with this email already exists. Please log in using your existing method.",
            });
          }

          // Prevent linking an email already associated with
          // another Google account.
          if (user.googleId && user.googleId !== googleId) {
            return done(null, false, {
              message: "This account is linked to another Google account.",
            });
          }

          if (!user.googleId) {
            user.googleId = googleId;
          }

          user.isEmailVerified = true;

          // Upload Google avatar only if user has no avatar.
          if (!user.avatar) {
            const photoUrl = profile.photos?.[0]?.value;

            const avatar = await getMinIOAvatar(photoUrl, "google");

            if (avatar) {
              user.avatar = avatar;
            }
          }

          await user.save();
        } else {
          const photoUrl = profile.photos?.[0]?.value;

          const avatar = await getMinIOAvatar(photoUrl, "google");

          user = await User.create({
            name: profile.displayName || "Google User",
            email,
            googleId,
            authProvider: "google",
            isEmailVerified: true,
            avatar,
          });
        }

        return done(null, user);
      } catch (error) {
        console.error("Google Strategy Error:", error.message);

        return done(error, false);
      }
    },
  ),
);

// ==========================================
// Facebook OAuth Strategy
// ==========================================

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "displayName", "emails", "photos"],
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const facebookId = profile.id;

        const email = normalizeEmail(profile.emails?.[0]?.value);

        if (!email) {
          return done(null, false, {
            message: "Facebook account email is unavailable.",
          });
        }

        let user = await User.findOne({ facebookId });

        if (user) {
          // Upload Facebook avatar only if user has no avatar.
          if (!user.avatar) {
            const photoUrl = profile.photos?.[0]?.value;

            const avatar = await getMinIOAvatar(photoUrl, "facebook");

            if (avatar) {
              user.avatar = avatar;
              await user.save();
            }
          }

          return done(null, user);
        }

        // Do not automatically link existing accounts by email.
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          return done(null, false, {
            message:
              "An account with this email already exists. Please use your existing login method.",
          });
        }

        const photoUrl = profile.photos?.[0]?.value;

        const avatar = await getMinIOAvatar(photoUrl, "facebook");

        user = await User.create({
          name: profile.displayName || "Facebook User",
          email,
          facebookId,
          authProvider: "facebook",
          isEmailVerified: true,
          avatar,
        });

        return done(null, user);
      } catch (error) {
        console.error("Facebook Strategy Error:", error.message);

        return done(error, false);
      }
    },
  ),
);

// ==========================================
// Export Passport
// ==========================================

export default passport;
