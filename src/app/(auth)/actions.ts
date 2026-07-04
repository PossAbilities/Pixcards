"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
} from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { sendWelcomeEmail } from "@/lib/email/dispatch";
import { recordEvent } from "@/lib/events";

const registerSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(60),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type AuthState = { error?: string } | undefined;

/** Only allow same-site relative redirects (e.g. "/c/ABC123"). */
function safeNext(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

async function uniqueUsername(base: string): Promise<string> {
  const root = slugify(base) || "user";
  let candidate = root;
  let n = 0;
  for (;;) {
    const exists = await prisma.profile.findUnique({
      where: { username: candidate },
    });
    if (!exists) return candidate;
    n += 1;
    candidate = `${root}${n}`;
  }
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password } = parsed.data;

  let userId: string;
  try {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return { error: "An account with that email already exists." };
    }

    const username = await uniqueUsername(name);

    // First-ever user becomes the admin (bootstraps production with no seed).
    // Alternatively, any email matching ADMIN_EMAIL (defaulting to the owner)
    // is granted admin.
    const userCount = await prisma.user.count();
    const adminEmail = (
      process.env.ADMIN_EMAIL || "digital@possabilities.org.uk"
    ).toLowerCase();
    const isAdmin = userCount === 0 || email.toLowerCase() === adminEmail;

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        role: isAdmin ? "ADMIN" : "USER",
        profile: {
          create: {
            username,
            email: email.toLowerCase(),
          },
        },
      },
    });
    userId = user.id;
  } catch (e) {
    console.error("registerAction: database error", e);
    return {
      error:
        "We couldn't create your account — the database may be unreachable. Please try again shortly (if this persists, check the DATABASE_URL configuration).",
    };
  }

  await createSession(userId);
  await recordEvent({
    type: "USER_REGISTERED",
    title: `New sign-up: ${name}`,
    message: email.toLowerCase(),
    meta: { userId, email: email.toLowerCase() },
  });
  await sendWelcomeEmail(userId);
  redirect(safeNext(formData.get("next")) ?? "/dashboard");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, password } = parsed.data;

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  } catch (e) {
    console.error("loginAction: database error", e);
    return {
      error:
        "We couldn't reach the database. Please try again shortly (if this persists, check the DATABASE_URL configuration).",
    };
  }
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  // Self-healing owner promotion: the build-time ensure-admin script is
  // skipped whenever a deploy's DB step fails, which can leave the owner
  // account without its admin role. Logging in as the owner email restores it.
  const adminEmail = (
    process.env.ADMIN_EMAIL || "digital@possabilities.org.uk"
  ).toLowerCase();
  if (user.email === adminEmail && user.role !== "ADMIN") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
  }

  await createSession(user.id);
  const next = safeNext(formData.get("next"));
  redirect(next ?? (user.role === "ADMIN" ? "/admin" : "/dashboard"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
