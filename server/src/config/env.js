import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development: Load root .env file.
// Production: Use environment variables from hosting platform.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({
    path: path.resolve(__dirname, "../../../.env"),
  });
}

const requiredEnvVariables = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "B2_ENDPOINT",
  "B2_REGION",
  "B2_BUCKET_NAME",
  "B2_APPLICATION_KEY_ID",
  "B2_APPLICATION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
  "FACEBOOK_CALLBACK_URL",
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]?.trim()) {
    throw new Error(`${variable} is not configured`);
  }
}

console.log(
  `Environment variables loaded for ${process.env.NODE_ENV || "development"}`,
);
