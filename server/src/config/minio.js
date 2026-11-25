import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const minioClient = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
});

export const MINIO_BUCKET = process.env.B2_BUCKET_NAME;

if (!MINIO_BUCKET) {
  throw new Error("B2_BUCKET_NAME is not configured");
}

export const initializeMinIO = async () => {
  console.log("Checking B2 bucket:", MINIO_BUCKET);

  await minioClient.send(
    new HeadBucketCommand({
      Bucket: MINIO_BUCKET,
    }),
  );

  console.log(`B2 bucket ready: ${MINIO_BUCKET}`);
};

export default minioClient;
