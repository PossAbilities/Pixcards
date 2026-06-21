import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The owner account that should always hold admin rights. Override with the
// ADMIN_EMAIL environment variable if it ever changes.
const DEFAULT_ADMIN_EMAIL = "digital@possabilities.org.uk";

// Seed/demo accounts that must never exist on the live site (they ship with a
// public password). Removed automatically in production.
const DEMO_EMAILS = [
  "admin@pixcards.app",
  "alex@pixcards.app",
  "eleanor@company.com",
  "derek@agency.io",
  "catherine@financials.com",
  "marcus@thorne.co",
  "sarah@sands.design",
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase();

  // Promote the owner to admin if their account exists.
  const owner = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (owner) {
    if (owner.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: owner.id },
        data: { role: "ADMIN" },
      });
      console.log(`✓ Promoted ${adminEmail} to ADMIN.`);
    } else {
      console.log(`✓ ${adminEmail} is already an ADMIN.`);
    }
  } else {
    console.log(
      `• No account for ${adminEmail} yet — it becomes ADMIN automatically on sign-up.`,
    );
  }

  // In production, purge any leftover demo/seed accounts (public passwords).
  if (process.env.NODE_ENV === "production") {
    const removable = DEMO_EMAILS.filter((e) => e !== adminEmail);
    const res = await prisma.user.deleteMany({
      where: { email: { in: removable } },
    });
    if (res.count > 0) {
      console.log(`✓ Removed ${res.count} leftover demo account(s).`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("ensure-admin failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
