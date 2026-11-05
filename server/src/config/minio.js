import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const minioClient = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.NETFLIX_MINIO_ROOT_USER,
    secretAccessKey: process.env.NETFLIX_MINIO_ROOT_PASSWORD,
  },
  forcePathStyle: true,
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET;

if (!MINIO_BUCKET) {
  throw new Error("MINIO_BUCKET is not configured");
}

console.log("Initializing MinIO bucket:", MINIO_BUCKET);

export const initializeMinIO = async () => {
  console.log("Initializing MinIO bucket:", MINIO_BUCKET);
  try {
    await minioClient.send(
      new HeadBucketCommand({
        Bucket: MINIO_BUCKET,
      }),
    );

    console.log(`MinIO bucket ready: ${MINIO_BUCKET}`);
  } catch (error) {
    if (error.name !== "NotFound" && error.$metadata?.httpStatusCode !== 404) {
      throw error;
    }

    await minioClient.send(
      new CreateBucketCommand({
        Bucket: MINIO_BUCKET,
      }),
    );

    console.log(`MinIO bucket created: ${MINIO_BUCKET}`);
  }
};

export default minioClient;
