import { withAuth } from "@/lib/api/handler";
import { listLocations } from "@/lib/services/workshops";

export const GET = withAuth("workshops:read", () => listLocations());
