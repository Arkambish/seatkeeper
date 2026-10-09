import { json, parseBody, withAuth } from "@/lib/api/handler";
import { createLocation, listLocations } from "@/lib/services/locations";
import { locationSchema } from "@/lib/validation/locations";

export const GET = withAuth("workshops:read", () => listLocations());

export const POST = withAuth("workshops:write", async ({ req, user }) => {
  const input = await parseBody(req, locationSchema);
  return json(await createLocation(input, user.id), 201);
});
