import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./auth";

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser(
  redirectTo = "/login",
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(redirectTo);
  return user;
}

/** Require an admin; redirect home otherwise. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
