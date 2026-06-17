/**
 * cloudinary.js — All image uploads go through Cloudinary (unsigned upload).
 *
 * Required .env variables:
 *   VITE_CLOUDINARY_CLOUD_NAME     — your Cloudinary cloud name
 *   VITE_CLOUDINARY_UPLOAD_PRESET  — an UNSIGNED upload preset (create in
 *                                    Cloudinary → Settings → Upload Presets)
 */

const MAX_FILE_SIZE_MB = 10;
const UPLOAD_TIMEOUT_MS = 60_000; // 60 seconds before we give up

/**
 * Upload a single image file to Cloudinary.
 * @param {File}   file   - The image file to upload
 * @param {string} folder - Sub-folder inside your Cloudinary account (e.g. "venues", "packages")
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
export const uploadToCloudinary = async (file, folder = "venues") => {
  const cloudName   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // ── Guard: env variables must be present ──────────────────────────────────
  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and " +
      "VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
    );
  }

  // ── Guard: file size ───────────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB. Please choose a smaller image.`);
  }

  // ── Build form data ────────────────────────────────────────────────────────
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", `venuefinder/${folder}`);

  // ── Upload with a 60-second timeout so it never hangs forever ─────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData, signal: controller.signal }
    );

    clearTimeout(timer);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Cloudinary error (HTTP ${response.status})`);
    }

    const data = await response.json();
    return data.secure_url;

  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Upload timed out after 60 seconds. Check your internet connection and try again.");
    }
    throw err;
  }
};

/**
 * Upload multiple images in parallel to Cloudinary.
 * @param {File[]|FileList} files
 * @param {string}          folder
 * @returns {Promise<string[]>} Array of secure URLs
 */
export const uploadMultipleToCloudinary = async (files, folder = "venues") => {
  return Promise.all(Array.from(files).map((f) => uploadToCloudinary(f, folder)));
};
