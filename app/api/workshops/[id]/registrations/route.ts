import { json, parseBody, parseQuery, withAuth } from "@/lib/api/handler";
import { listRegistrations, registerAttendee } from "@/lib/services/registrations";
import { uuid } from "@/lib/validation/common";
import { registerAttendeeSchema, registrationFiltersSchema } from "@/lib/validation/registrations";

export const GET = withAuth<{ id: string }>("workshops:read", async ({ req, params }) => {
  const { status } = parseQuery(req, registrationFiltersSchema);
  return listRegistrations(uuid.parse(params.id), status);
});

export const POST = withAuth<{ id: string }>("registrations:write", async ({ req, user, params }) => {
  const input = await parseBody(req, registerAttendeeSchema);
  return json(await registerAttendee(uuid.parse(params.id), input, user), 201);
});
