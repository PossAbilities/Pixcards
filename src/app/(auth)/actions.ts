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

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const username = await uniqueUsername(name);
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      profile: {
        create: {
          username,
          email: email.toLowerCase(),
        },
      },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
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

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
