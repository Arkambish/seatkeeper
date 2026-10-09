import { withAuth } from "@/lib/api/handler";

export const GET = withAuth("authenticated", async ({ user }) => user);
