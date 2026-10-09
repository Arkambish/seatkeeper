import { invalidatePublicCatalogue } from "@/lib/public-cache";
import { json, parseBody, parseQuery, withAuth } from "@/lib/api/handler";
import { createWorkshop, listWorkshops } from "@/lib/services/workshops";
import { createWorkshopSchema, workshopFiltersSchema } from "@/lib/validation/workshops";

export const GET = withAuth("workshops:read", async ({ req }) =>
  listWorkshops(parseQuery(req, workshopFiltersSchema)),
);

export const POST = withAuth("workshops:write", async ({ req, user }) => {
  const input = await parseBody(req, createWorkshopSchema);
  const created = await createWorkshop(input, user.id);
  invalidatePublicCatalogue();
  return json(created, 201);
});
