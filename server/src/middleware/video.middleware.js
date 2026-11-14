import multer from "multer";

const allowedVideoMimeTypes = ["video/mp4", "video/webm", "video/quicktime"];

const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (
    file.fieldname === "video" &&
    allowedVideoMimeTypes.includes(file.mimetype)
  ) {
    return callback(null, true);
  }

  if (
    file.fieldname === "thumbnail" &&
    allowedImageMimeTypes.includes(file.mimetype)
  ) {
    return callback(null, true);
  }

  callback(
    new Error(
      "Invalid file type. Video: MP4, WEBM, MOV. Thumbnail: JPEG, PNG, WEBP.",
    ),
  );
};

const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB
    files: 2,
  },
});

export default uploadVideo;
