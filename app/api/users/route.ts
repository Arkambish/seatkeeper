import { json, parseBody, withAuth } from "@/lib/api/handler";
import { createUser, listUsers } from "@/lib/services/users";
import { createUserSchema } from "@/lib/validation/users";

export const GET = withAuth("users:manage", () => listUsers());

export const POST = withAuth("users:manage", async ({ req, user }) => {
  const input = await parseBody(req, createUserSchema);
  return json(await createUser(input, user.id), 201);
});
