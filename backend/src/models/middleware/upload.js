import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed file types
const ALLOWED_FILE_TYPES = /jpeg|jpg|png|webp/;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// File size limit (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store in uploads/profile_pics directory
    const uploadPath = path.join(__dirname, "../../../uploads/profile_pics");
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId-timestamp-random.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?.id || "unknown";
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1e9);
    const filename = `${userId}-${timestamp}-${randomString}${ext}`;
    cb(null, filename);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file extension
  const extname = ALLOWED_FILE_TYPES.test(
    path.extname(file.originalname).toLowerCase()
  );
  
  // Check MIME type
  const mimetype = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, JPG, PNG, and WebP images are allowed."
      )
    );
  }
};

// Create multer instance
export const uploadProfilePicture = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});

// Middleware to handle multer errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File size too large. Maximum size is 2MB.",
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
  next();
};

export default { uploadProfilePicture, handleUploadError };
