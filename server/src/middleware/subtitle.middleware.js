import multer from "multer";

const uploadSubtitleFiles = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, callback) => {
    const isVtt =
      file.originalname.toLowerCase().endsWith(".vtt") &&
      ["text/vtt", "application/octet-stream"].includes(file.mimetype);

    if (!isVtt) {
      const error = new Error("Subtitle files must be WebVTT (.vtt).");
      error.status = 400;
      callback(error);
      return;
    }

    callback(null, true);
  },
}).array("subtitleFiles", 10);

export default uploadSubtitleFiles;
