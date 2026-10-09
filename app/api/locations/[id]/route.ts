import { noContent, parseBody, withAuth } from "@/lib/api/handler";
import { deleteLocation, renameLocation } from "@/lib/services/locations";
import { uuid } from "@/lib/validation/common";
import { locationSchema } from "@/lib/validation/locations";

export const PATCH = withAuth<{ id: string }>("workshops:write", async ({ req, user, params }) => {
  const input = await parseBody(req, locationSchema);
  return renameLocation(uuid.parse(params.id), input, user.id);
});

export const DELETE = withAuth<{ id: string }>("workshops:write", async ({ user, params }) => {
  await deleteLocation(uuid.parse(params.id), user.id);
  return noContent();
});
