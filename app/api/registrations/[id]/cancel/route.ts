import { invalidatePublicCatalogue } from "@/lib/public-cache";
import { parseBody, withAuth } from "@/lib/api/handler";
import { cancelRegistration } from "@/lib/services/registrations";
import { uuid } from "@/lib/validation/common";
import { cancelRegistrationSchema } from "@/lib/validation/registrations";

// POST (not DELETE): cancelling never deletes the record, it changes its status.
export const POST = withAuth<{ id: string }>("registrations:write", async ({ req, user, params }) => {
  const { reason } = await parseBody(req, cancelRegistrationSchema);
  const result = await cancelRegistration(uuid.parse(params.id), user, reason);
  invalidatePublicCatalogue(); // a seat was freed
  return result;
});
