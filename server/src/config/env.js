import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const requiredEnvVariables = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "MINIO_ENDPOINT",
  "MINIO_BUCKET",
  "NETFLIX_MINIO_ROOT_USER",
  "NETFLIX_MINIO_ROOT_PASSWORD",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
  "FACEBOOK_CALLBACK_URL",
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`${variable} is not configured`);
  }
}
