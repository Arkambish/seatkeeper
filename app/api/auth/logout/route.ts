import { json, publicRoute } from "@/lib/api/handler";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = publicRoute(async ({ req }) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  const res = json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
