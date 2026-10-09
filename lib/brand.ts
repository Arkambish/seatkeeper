/** Product identity. Change the name here and it updates everywhere. */
export const BRAND = {
  name: "Seatkeeper",
  tagline: "Workshop registrations for the front desk",
  organisation: "Community Training Centre",
  description:
    "Register attendees, manage workshop seats and keep a full history of every booking and cancellation, without ever overbooking.",
  /**
   * Front-desk contact shown on the public site. PLACEHOLDER values: replace
   * with the centre's real number, address and hours before launch.
   */
  contact: {
    phone: "+94 11 250 4410",
    phoneHref: "tel:+94112504410",
    email: "frontdesk@example.com",
    hours: "Monday to Saturday, 8.30am to 6pm",
  },
  /** Amber: the "last seat" accent used in the mark. */
  accent: "#956400",
  ink: "#111111",
  paper: "#fbfbfa",
} as const;

/**
 * Absolute base URL for metadata (Open Graph, sitemap, structured data).
 * NEXT_PUBLIC_APP_URL wins; on Vercel the production domain is picked up
 * automatically; locally it falls back to localhost.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000";
