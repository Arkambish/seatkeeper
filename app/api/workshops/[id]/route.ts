import { noContent, parseBody, withAuth } from "@/lib/api/handler";
import { deleteWorkshop, getWorkshop, updateWorkshop } from "@/lib/services/workshops";
import { uuid } from "@/lib/validation/common";
import { updateWorkshopSchema } from "@/lib/validation/workshops";

export const GET = withAuth<{ id: string }>("workshops:read", async ({ params }) =>
  getWorkshop(uuid.parse(params.id)),
);

export const PATCH = withAuth<{ id: string }>("workshops:write", async ({ req, user, params }) => {
  const input = await parseBody(req, updateWorkshopSchema);
  return updateWorkshop(uuid.parse(params.id), input, user.id);
});

/** Only workshops that never had a registration; otherwise 409 (cancel instead). */
export const DELETE = withAuth<{ id: string }>("workshops:write", async ({ user, params }) => {
  await deleteWorkshop(uuid.parse(params.id), user.id);
  return noContent();
});
