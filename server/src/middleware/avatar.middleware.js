import multer from "multer";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new Error("Only JPG, PNG and WEBP images are allowed"));
  }

  callback(null, true);
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export default uploadAvatar;
