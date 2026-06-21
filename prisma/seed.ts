import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Safeguard: never create demo/test accounts on a production deploy, even if
  // SEED_DEMO=true is left set. Demo accounts ship with a public password and
  // must never exist on the live site.
  if (process.env.NODE_ENV === "production") {
    console.log("Production environment — refusing to seed demo accounts.");
    return;
  }

  // Only seed an empty database. This makes the seed a safe one-time bootstrap:
  // leaving SEED_DEMO=true on the host won't keep re-adding demo data once the
  // database has real users. Force a re-seed locally with `prisma db push --force-reset`.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(
      `Database already has ${existingUsers} user(s) — skipping demo seed.`,
    );
    return;
  }

  const pw = await bcrypt.hash("password123", 10);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@pixcards.app" },
    update: {},
    create: {
      email: "admin@pixcards.app",
      passwordHash: pw,
      name: "Pixcards Admin",
      role: "ADMIN",
      plan: "PRO",
      proSince: new Date(),
      profile: {
        create: {
          username: "admin",
          jobTitle: "Platform Administrator",
          company: "Pixcards Inc.",
          bio: "Keeping the Pixcards platform running smoothly.",
          email: "admin@pixcards.app",
          theme: "midnight",
          accentColor: "#0f172a",
        },
      },
    },
  });

  // Demo Pro user — Alex Sterling (matches the mockups)
  const alex = await prisma.user.upsert({
    where: { email: "alex@pixcards.app" },
    update: {},
    create: {
      email: "alex@pixcards.app",
      passwordHash: pw,
      name: "Alex Sterling",
      plan: "PRO",
      proSince: new Date(),
      profile: {
        create: {
          username: "alex",
          jobTitle: "Senior Product Designer",
          company: "Studio Nova",
          bio: "Crafting seamless digital experiences at the intersection of technology and human-centric design. Open for collaborations.",
          location: "London, UK",
          phone: "+44 20 7946 0958",
          email: "alex@pixcards.app",
          theme: "indigo",
          accentColor: "#4f46e5",
          links: {
            create: [
              { platform: "linkedin", label: "LinkedIn Profile", url: "https://linkedin.com/in/alexsterling", icon: "work", position: 0 },
              { platform: "website", label: "Portfolio Website", url: "https://alexsterling.design", icon: "language", position: 1 },
              { platform: "instagram", label: "Instagram", url: "https://instagram.com/sterling_works", icon: "photo_camera", position: 2 },
              { platform: "github", label: "GitHub", url: "https://github.com/alexsterling", icon: "code", position: 3 },
            ],
          },
        },
      },
    },
    include: { profile: true },
  });

  // A few more free users for the admin table
  const others = [
    { email: "eleanor@company.com", name: "Eleanor Vance", plan: "PRO" as const, job: "Marketing Director" },
    { email: "derek@agency.io", name: "Derek Lawson", plan: "FREE" as const, job: "Brand Strategist" },
    { email: "catherine@financials.com", name: "Catherine Grey", plan: "PRO" as const, job: "Financial Advisor" },
    { email: "marcus@thorne.co", name: "Marcus Thorne", plan: "FREE" as const, job: "Software Engineer" },
    { email: "sarah@sands.design", name: "Sarah Sands", plan: "FREE" as const, job: "UX Researcher" },
  ];
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    await prisma.user.upsert({
      where: { email: o.email },
      update: {},
      create: {
        email: o.email,
        passwordHash: pw,
        name: o.name,
        plan: o.plan,
        proSince: o.plan === "PRO" ? new Date() : null,
        profile: {
          create: {
            username: o.name.toLowerCase().split(" ")[0] + (i + 1),
            jobTitle: o.job,
            email: o.email,
          },
        },
      },
    });
  }

  // Sample orders for fulfilment dashboard
  const allUsers = await prisma.user.findMany({ take: 6 });
  const materials = ["white-gloss"];
  const statuses = ["PENDING", "PRINTING", "SHIPPED", "DELIVERED", "PAID"] as const;
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    for (let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      await prisma.order.create({
        data: {
          userId: u.id,
          material: materials[i % materials.length],
          cardName: u.name,
          quantity: 1,
          priceCents: [5900, 2900, 3400, 2900][i % 4],
          status: statuses[i % statuses.length],
          shipName: u.name,
          shipAddress: `${10 + i} High Street`,
          shipCity: "London",
          shipPostal: "EC1A 1BB",
          createdAt: new Date(Date.now() - i * 86400000),
        },
      });
    }
  }

  // Seed some analytics for Alex
  if (alex.profile) {
    const profileId = alex.profile.id;
    const events = await prisma.analyticsEvent.count({ where: { profileId } });
    if (events === 0) {
      const links = await prisma.link.findMany({ where: { profileId } });
      const data = [];
      for (let d = 0; d < 30; d++) {
        const day = new Date(Date.now() - d * 86400000);
        const views = 3 + Math.floor(Math.random() * 12);
        for (let v = 0; v < views; v++) {
          data.push({ profileId, type: "VIEW" as const, createdAt: day });
        }
        const clicks = Math.floor(Math.random() * 6);
        for (let c = 0; c < clicks; c++) {
          const link = links[Math.floor(Math.random() * links.length)];
          data.push({ profileId, type: "LINK_CLICK" as const, linkId: link?.id, createdAt: day });
        }
      }
      await prisma.analyticsEvent.createMany({ data });
    }
  }

  console.log("Seed complete.");
  console.log("  Admin:  admin@pixcards.app / password123");
  console.log("  User:   alex@pixcards.app  / password123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
