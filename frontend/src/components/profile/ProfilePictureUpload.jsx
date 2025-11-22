import { useState, useRef, useEffect } from "react";
import axios from "axios";
import styles from "./ProfilePictureUpload.module.css";

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:5000";

const ProfilePictureUpload = ({ currentPictureUrl, onUploadSuccess, allowDelete = true }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentPictureUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  // Maximum file size (2MB)
  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setError(null);
    setSuccess(null);

    if (!file) {
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 2MB");
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    console.log("=== STARTING UPLOAD ===");
    console.log("Selected file:", selectedFile);
    console.log("File name:", selectedFile.name);
    console.log("File size:", selectedFile.size);
    console.log("File type:", selectedFile.type);

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("profilePicture", selectedFile);

      const token = localStorage.getItem("token");
      console.log("Token:", token ? "Present" : "Missing");
      console.log("Token length:", token?.length);
      console.log("API_BASE_URL:", API_BASE_URL);
      console.log("Full API URL:", `${API_BASE_URL}/api/alumni/profile/upload-picture`);
      console.log("FormData entries:", Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `File: ${v.name}` : v]));

      const response = await axios.post(
        `${API_BASE_URL}/api/alumni/profile/upload-picture`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Upload response:", response.data);

      if (response.data.success) {
        setSuccess("Profile picture uploaded successfully!");
        setSelectedFile(null);
        setPreviewUrl(response.data.data.profilePictureUrl);
        
        // Call parent callback if provided
        if (onUploadSuccess) {
          console.log("Calling onUploadSuccess with URL:", response.data.data.profilePictureUrl);
          onUploadSuccess(response.data.data.profilePictureUrl);
        }
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      console.error("Error message:", err.message);
      console.error("Request URL was:", `${API_BASE_URL}/api/alumni/profile/upload-picture`);
      console.error("Full error object:", JSON.stringify(err.response, null, 2));
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to upload profile picture. Please try again."
      );
    } finally {
      setUploading(false);
      console.log("=== UPLOAD COMPLETE ===");
    }
  };

  useEffect(() => {
    setPreviewUrl(currentPictureUrl || null);
  }, [currentPictureUrl]);

  const handleDelete = async () => {
    if (!allowDelete) return;

    if (!currentPictureUrl && !previewUrl) {
      setError("No profile picture to delete");
      return;
    }

    if (!window.confirm("Are you sure you want to delete your profile picture?")) {
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_BASE_URL}/api/alumni/profile/delete-picture`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess("Profile picture deleted successfully!");
        setPreviewUrl(null);
        setSelectedFile(null);
        
        // Call parent callback if provided
        if (onUploadSuccess) {
          onUploadSuccess(null);
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to delete profile picture. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(currentPictureUrl || null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${API_BASE_URL}${url}`;
  };

  return (
    <div className={styles.uploadContainer}>
      <div className={styles.previewSection}>
        <div className={styles.imageWrapper}>
          {previewUrl ? (
            <img
              src={selectedFile ? previewUrl : getImageUrl(previewUrl)}
              alt="Profile"
              className={styles.profileImage}
            />
          ) : (
            <div className={styles.placeholderImage}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className={styles.controlsSection}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className={styles.fileInput}
          disabled={uploading}
        />

        <div className={styles.buttonGroup}>
          {selectedFile ? (
            <>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className={`${styles.button} ${styles.uploadButton}`}
              >
                {uploading ? "Uploading..." : "Upload Picture"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={uploading}
                className={`${styles.button} ${styles.cancelButton}`}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`${styles.button} ${styles.selectButton}`}
              >
                Select Picture
              </button>
              {allowDelete && (currentPictureUrl || previewUrl) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={uploading}
                  className={`${styles.button} ${styles.deleteButton}`}
                >
                  {uploading ? "Deleting..." : "Delete Picture"}
                </button>
              )}
            </>
          )}
        </div>

        <p className={styles.helpText}>
          Accepted formats: JPEG, PNG, WebP. Max size: 2MB
        </p>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
