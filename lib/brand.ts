/** Product identity. Change the name here and it updates everywhere. */
export const BRAND = {
  name: "Seatkeeper",
  tagline: "Workshop registrations for the front desk",
  organisation: "Community Training Centre",
  description:
    "Register attendees, manage workshop seats and keep a full history of every booking and cancellation, without ever overbooking.",
  /** Amber: the "last seat" accent used in the mark. */
  accent: "#956400",
  ink: "#111111",
  paper: "#fbfbfa",
} as const;

/** Absolute base URL for metadata (Open Graph etc.). */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
