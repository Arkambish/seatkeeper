import { Suspense } from "react";
import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export default function Home() {
  return (
    <Suspense>
      <RedirectHome />
    </Suspense>
  );
}

async function RedirectHome(): Promise<null> {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user.role) : "/login");
}
