import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { can, type Permission } from "@/lib/auth/permissions";
import { getUserFromToken, SESSION_COOKIE, type AuthUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return json({ error: { code: e.code, message: e.message, fields: e.fields } }, e.status);
  }
  if (e instanceof ZodError) {
    const fields = e.flatten().fieldErrors as Record<string, string[]>;
    return json(
      { error: { code: "VALIDATION_FAILED", message: "Please check the highlighted fields.", fields } },
      400,
    );
  }
  console.error(e);
  return json({ error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, 500);
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defence in depth (the cookie is already SameSite=Lax): browsers always
 * send Origin on cross-site mutations, so reject any whose host differs.
 * Requests without Origin (curl, server-to-server) carry no ambient cookie risk.
 */
function assertSameOrigin(req: NextRequest) {
  if (!MUTATING.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new AppError("FORBIDDEN", "Cross-site request blocked.");
}

type Params = Record<string, string | string[] | undefined>;

type Handler<P extends Params, U> = (ctx: {
  req: NextRequest;
  user: U;
  params: P;
}) => Promise<Response | unknown>;

type RouteCtx<P> = { params: Promise<P> };

/**
 * Wraps every API route. Access control lives here, on the server, not in the UI:
 *  - 401 when there is no valid session
 *  - 403 when the user's role lacks `permission`
 *  - 400 for validation errors, 404/409 for domain errors (see AppError)
 * Handlers return plain data (sent as 200 JSON) or a Response for other statuses.
 */
export function withAuth<P extends Params = Params>(
  permission: Permission | "authenticated",
  handler: Handler<P, AuthUser>,
) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    try {
      assertSameOrigin(req);
      const user = await getUserFromToken(req.cookies.get(SESSION_COOKIE)?.value);
      if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in.");
      if (permission !== "authenticated" && !can(user.role, permission)) {
        throw new AppError("FORBIDDEN", "You don't have permission to do that.");
      }
      const result = await handler({ req, user, params: await ctx.params });
      return result instanceof Response ? result : json(result);
    } catch (e) {
      unstable_rethrow(e); // let Next's own control-flow signals through
      return errorResponse(e);
    }
  };
}

/** Same error handling and CSRF check, for the few routes that need no session (login). */
export function publicRoute<P extends Params = Params>(handler: Handler<P, null>) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    try {
      assertSameOrigin(req);
      const result = await handler({ req, user: null, params: await ctx.params });
      return result instanceof Response ? result : json(result);
    } catch (e) {
      unstable_rethrow(e); // let Next's own control-flow signals through
      return errorResponse(e);
    }
  };
}

/** Parses and validates a JSON body. An empty body is treated as `{}`. */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T, ZodTypeDef, unknown>) {
  let body: unknown;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new AppError("VALIDATION_FAILED", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T, ZodTypeDef, unknown>) {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
