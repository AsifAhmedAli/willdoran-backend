const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // Specify the folder where the file will be stored temporarily
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original name of the file
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/msword" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only Word files are allowed."), false);
  }
};

const limits = {
  fileSize: 1000000, // Limit file size to 1MB
};

const upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter,
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer error occurred
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size limit exceeded. Maximum file size allowed is 1MB.",
      });
    }
    return res
      .status(500)
      .json({ error: "An error occurred during file upload." });
  } else if (err) {
    // Other error occurred
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = { upload, handleUploadError };
