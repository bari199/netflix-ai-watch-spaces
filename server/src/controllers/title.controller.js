import {
  createTitle,
  getPublishedTitles,
  getTitleById,
  updateTitle,
  deleteTitle,
  getTitleThumbnail,
  getTitleVideo,
  updateTitleSubtitleVariants,
  getTitleSubtitle,
} from "../services/title.service.js";

// Handle controller errors
const handleTitleError = (res, error) => {
  console.error("Title API Error:", error.message);

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error.message === "Title not found" ||
    error.message === "Subtitle variant not found" ||
    error.message === "Thumbnail not found"
  ) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error.message.includes("not allowed") ||
    error.message.includes("valid title update data")
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// Parse JSON fields from multipart/form-data
const parseTitleJsonFields = (data) => {
  const parsedData = { ...data };

  try {
    if (typeof parsedData.genre === "string") {
      parsedData.genre = JSON.parse(parsedData.genre);
    }

    if (typeof parsedData.timeline === "string") {
      parsedData.timeline = JSON.parse(parsedData.timeline);
    }
  } catch {
    throw new Error("Invalid JSON format in genre or timeline");
  }

  return parsedData;
};

// Create title with video upload
export const createTitleController = async (req, res) => {
  try {
    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!videoFile) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    const titleData = parseTitleJsonFields(req.body);

    const title = await createTitle(
      titleData,
      req.user._id,
      videoFile,
      thumbnailFile,
    );

    return res.status(201).json({
      success: true,
      message: "Title created successfully",
      title,
    });
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Get all published titles
export const getPublishedTitlesController = async (req, res) => {
  try {
    const titles = await getPublishedTitles();

    return res.status(200).json({
      success: true,
      count: titles.length,
      titles,
    });
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Get a published title by ID
export const getTitleByIdController = async (req, res) => {
  try {
    const title = await getTitleById(req.params.titleId);

    return res.status(200).json({
      success: true,
      title,
    });
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Update title
export const updateTitleController = async (req, res) => {
  try {
    const thumbnailFile = req.files?.thumbnail?.[0];
    const videoFile = req.files?.video?.[0];

    const updates = parseTitleJsonFields(req.body);

    if (thumbnailFile) {
      updates.thumbnailFile = thumbnailFile;
    }

    if (videoFile) {
      updates.videoFile = videoFile;
    }

    const title = await updateTitle(req.params.titleId, updates);

    return res.status(200).json({
      success: true,
      message: "Title updated successfully",
      title,
    });
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Update title subtitle variants
export const updateTitleSubtitleVariantsController = async (req, res) => {
  try {
    let variants = req.body.variants;

    if (typeof variants === "string") {
      try {
        variants = JSON.parse(variants);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format in subtitle variants",
        });
      }
    }

    if (!Array.isArray(variants)) {
      return res.status(400).json({
        success: false,
        message: "Subtitle variants must be an array",
      });
    }

    const subtitleFiles = req.files || [];

    const title = await updateTitleSubtitleVariants(
      req.params.titleId,
      variants,
      subtitleFiles,
    );

    // Do not expose internal MinIO storage keys
    const safeTitle = title.toObject();

    safeTitle.subtitleVariants = safeTitle.subtitleVariants.map(
      ({ storageKey, ...variant }) => variant,
    );

    return res.status(200).json({
      success: true,
      message: "Subtitle variants updated successfully",
      subtitleVariants: safeTitle.subtitleVariants,
    });
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Get a specific subtitle variant
export const getTitleSubtitleController = async (req, res) => {
  try {
    const result = await getTitleSubtitle(
      req.params.titleId,
      req.params.variantId,
    );

    res.set({
      "Content-Type": result.ContentType || "text/vtt",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    result.Body.on("error", (error) => {
      console.error("Subtitle stream error:", error.message);

      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(error);
      }
    });

    result.Body.pipe(res);
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Get title thumbnail
export const getTitleThumbnailController = async (req, res) => {
  try {
    const result = await getTitleThumbnail(req.params.titleId);

    res.set({
      "Content-Type": result.ContentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    result.Body.on("error", (error) => {
      console.error("Thumbnail stream error:", error.message);

      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(error);
      }
    });

    result.Body.pipe(res);
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Stream title video with HTTP Range support
export const getTitleVideoController = async (req, res) => {
  try {
    const result = await getTitleVideo(req.params.titleId, req.headers.range);

    const headers = {
      "Content-Type": result.ContentType || "application/octet-stream",
      "Content-Length": result.ContentLength,
      "Accept-Ranges": result.AcceptRanges || "bytes",
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    };

    if (result.ContentRange) {
      headers["Content-Range"] = result.ContentRange;
    }

    res.set(headers);
    res.status(result.ContentRange ? 206 : 200);

    result.Body.on("error", (error) => {
      console.error("Video stream error:", error.message);

      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(error);
      }
    });

    result.Body.pipe(res);
  } catch (error) {
    console.error("Get title video error:", error.message);

    if (error.statusCode === 416) {
      return res
        .status(416)
        .set("Content-Range", error.contentRange)
        .set("Accept-Ranges", "bytes")
        .json({
          success: false,
          message: error.message,
        });
    }

    return handleTitleError(res, error);
  }
};

// Delete title
export const deleteTitleController = async (req, res) => {
  try {
    await deleteTitle(req.params.titleId);

    return res.status(200).json({
      success: true,
      message: "Title deleted successfully",
    });
  } catch (error) {
    return handleTitleError(res, error);
  }
};
