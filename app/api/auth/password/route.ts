import { parseBody, withAuth } from "@/lib/api/handler";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { changeOwnPassword } from "@/lib/services/users";
import { changePasswordSchema } from "@/lib/validation/password";

/** Any signed-in user changes their own password, including one still on a temporary password. */
export const POST = withAuth(
  "authenticated",
  async ({ req, user }) => {
    const input = await parseBody(req, changePasswordSchema);
    await changeOwnPassword(user.id, input, req.cookies.get(SESSION_COOKIE)!.value);
    return { ok: true };
  },
  { allowPendingPasswordChange: true },
);
