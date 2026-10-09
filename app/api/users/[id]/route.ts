import { parseBody, withAuth } from "@/lib/api/handler";
import { updateUser } from "@/lib/services/users";
import { uuid } from "@/lib/validation/common";
import { updateUserSchema } from "@/lib/validation/users";

export const PATCH = withAuth<{ id: string }>("users:manage", async ({ req, user, params }) => {
  const input = await parseBody(req, updateUserSchema);
  return updateUser(uuid.parse(params.id), input, user.id);
});
