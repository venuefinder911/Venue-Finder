import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Creates a complaint document in Firestore.
 * @param {Object} params
 * @param {string} params.customerId
 * @param {string} params.customerEmail
 * @param {string} params.customerName
 * @param {string} params.venueId
 * @param {string} params.venueName
 * @param {string} params.type  – "fraudulent_venue" | "misleading_info" | "poor_service" | "custom"
 * @param {string} params.description
 */
export const createComplaint = async ({
  customerId,
  customerEmail,
  customerName,
  venueId,
  venueName,
  type,
  description,
}) => {
  await addDoc(collection(db, "complaints"), {
    customerId,
    customerEmail,
    customerName: customerName || "",
    venueId,
    venueName,
    type,
    description,
    status: "pending",      // pending | under_review | resolved | dismissed
    adminNote: "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};
