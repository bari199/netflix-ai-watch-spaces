import {
  createTitle,
  getPublishedTitles,
  getTitleById,
  updateTitle,
  deleteTitle,
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

  if (error.message === "Title not found") {
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

// Create title
// Create title with video upload
export const createTitleController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    const titleData = { ...req.body };

    // Parse JSON fields received through multipart/form-data
    try {
      if (typeof titleData.genre === "string") {
        titleData.genre = JSON.parse(titleData.genre);
      }

      if (typeof titleData.timeline === "string") {
        titleData.timeline = JSON.parse(titleData.timeline);
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON format in genre or timeline",
      });
    }

    const title = await createTitle(titleData, req.user._id, req.file);

    return res.status(201).json({
      success: true,
      message: "Title created successfully",
      title,
    });
  } catch (error) {
    return handleTitleError(res, error);
  }
};

// Get published titles
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

// Get title by ID
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
    const title = await updateTitle(req.params.titleId, req.body);

    return res.status(200).json({
      success: true,
      message: "Title updated successfully",
      title,
    });
  } catch (error) {
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
