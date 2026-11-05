import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/User.js";

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

        const email = profile.emails?.[0]?.value?.toLowerCase().trim();

        if (!email) {
          return done(new Error("Google account email is unavailable"));
        }

        let user = await User.findOne({
          $or: [{ googleId }, { email }],
        });

        if (user) {
          if (user.authProvider === "local" && !user.googleId) {
            return done(null, false, {
              message:
                "An account with this email already exists. Please log in using your existing method.",
            });
          }

          if (!user.googleId) {
            user.googleId = googleId;
          }

          user.isEmailVerified = true;

          await user.save();
        } else {
          user = await User.create({
            name: profile.displayName || "Google User",
            email,
            googleId,
            authProvider: "google",
            isEmailVerified: true,
          });
        }

        return done(null, user);
      } catch (error) {
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
        // Temporary debugging: inspect Facebook profile fields
        console.log(
          "Facebook Profile Debug:",
          JSON.stringify(
            {
              id: profile.id,
              displayName: profile.displayName,
              emails: profile.emails,
              photos: profile.photos,
            },
            null,
            2,
          ),
        );

        const facebookId = profile.id;

        const email = profile.emails?.[0]?.value?.toLowerCase().trim();

        if (!email) {
          console.error("Facebook OAuth: Email was not returned by Facebook.");

          return done(null, false, {
            message: "Facebook account email is unavailable",
          });
        }

        let user = await User.findOne({ facebookId });

        if (user) {
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

        user = await User.create({
          name: profile.displayName || "Facebook User",
          email,
          facebookId,
          authProvider: "facebook",
          isEmailVerified: true,
          avatar: profile.photos?.[0]?.value || "",
        });

        return done(null, user);
      } catch (error) {
        console.error("Facebook Strategy Error:", error.message);

        return done(error, false);
      }
    },
  ),
);

export default passport;
