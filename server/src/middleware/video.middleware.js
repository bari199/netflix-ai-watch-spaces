import multer from "multer";

const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new Error("Only MP4, WEBM and MOV videos are allowed"));
  }

  callback(null, true);
};

const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB
    files: 1,
  },
});

export default uploadVideo;
