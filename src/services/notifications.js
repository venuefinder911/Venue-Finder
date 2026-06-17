import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Write a notification document to Firestore.
 * @param {object} opts
 * @param {string} opts.userId      - recipient UID
 * @param {string} opts.title       - short heading
 * @param {string} opts.message     - body text
 * @param {string} opts.type        - booking_approved | booking_rejected | booking_cancelled_by_owner | booking_cancelled_by_customer | new_message
 * @param {string} [opts.bookingId]
 * @param {string} [opts.venueName]
 * @param {string} [opts.chatId]    - for new_message notifications
 */
export const createNotification = async ({ userId, title, message, type, bookingId, venueName, chatId }) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      message,
      type,
      bookingId:  bookingId  || "",
      venueName:  venueName  || "",
      chatId:     chatId     || "",
      read: false,
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
};
