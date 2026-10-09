import { withAuth } from "@/lib/api/handler";

// Allowed while a temporary password is pending, so the UI can show the change prompt.
export const GET = withAuth("authenticated", async ({ user }) => user, { allowPendingPasswordChange: true });
