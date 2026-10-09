/**
 * Dev seed: one Admin (the only account the spec requires), demo Manager and
 * Staff accounts, three locations and a spread of workshops around today so
 * every screen has something to show. Safe to re-run: it upserts by unique
 * keys and only adds registrations to workshops that have none.
 */
import { PrismaClient, type RegistrationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TZDate } from "@date-fns/tz";

const prisma = new PrismaClient();
const TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || "UTC";

/** A wall-clock time `dayOffset` days from today, in the centre's timezone. */
function at(dayOffset: number, hour: number, minute = 0) {
  const now = new TZDate(Date.now(), TZ);
  return new Date(
    new TZDate(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, TZ).getTime(),
  );
}

// Sri Lankan names, kept within naming traditions (Sinhala, Tamil, Muslim,
// Burgher) so the combinations read as real people.
const NAME_GROUPS: { first: string[]; last: string[] }[] = [
  {
    first: ["Ashan", "Dinuka", "Hiruni", "Kavindi", "Malith", "Nethmi", "Pasan", "Sachini", "Thilina", "Yasara", "Chathuri", "Isuru", "Dulani", "Ravindu", "Sewmini", "Gayan"],
    last: ["Perera", "Fernando", "Jayasinghe", "Wickramasinghe", "Bandara", "Herath", "Dissanayake", "Gunawardena", "Ekanayake", "Rajapaksha"],
  },
  {
    first: ["Arjun", "Priyanka", "Kavitha", "Suresh", "Lakshmi", "Thushanthan", "Nivetha", "Kajan"],
    last: ["Sivakumar", "Nadarajah", "Selvaraj", "Thurairajah", "Balasingham"],
  },
  {
    first: ["Fathima", "Rizwan", "Aaqil", "Shifna", "Imran", "Zainab"],
    last: ["Mohamed", "Marikar", "Cassim", "Hameed"],
  },
  { first: ["Shehan", "Michelle", "Dylan"], last: ["de Silva", "Ondaatje", "Jansz"] },
];
const attendee = (i: number) => {
  const g = NAME_GROUPS[i % 7 < 4 ? 0 : i % 7 < 6 ? 1 : i % 2 ? 2 : 3];
  const first = g.first[(i * 7) % g.first.length];
  const last = g.last[(i * 3 + Math.floor(i / g.first.length)) % g.last.length];
  const handle = `${first}.${last}`.toLowerCase().replace(/\s+/g, "");
  // example.com is reserved for documentation, so these can never reach a real inbox.
  return { attendeeName: `${first} ${last}`, attendeeEmail: `${handle}@example.com` };
};

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Dilani Jayawardena", email: "admin@example.com", role: "ADMIN", passwordHash: await hash("Admin123!") },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: { name: "Kasun Perera", email: "manager@example.com", role: "MANAGER", passwordHash: await hash("Manager123!") },
  });
  const staff = await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: { name: "Tharushi Fernando", email: "staff@example.com", role: "STAFF", passwordHash: await hash("Staff123!") },
  });

  const locations = await Promise.all(
    ["Colombo 07 Studio", "Nugegoda Hall", "Dehiwala Hub"].map((name) =>
      prisma.location.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const [north, river, town] = locations;

  type Seed = {
    code: string; title: string; description: string; instructor: string; locationId: string;
    startsAt: Date; endsAt: Date; capacity: number; status?: "SCHEDULED" | "CANCELLED" | "COMPLETED";
    active: number; cancelled?: number; waitlisted?: number;
  };

  const workshops: Seed[] = [
    { code: "POT-101", title: "Wheel Throwing for Beginners", description: "Centre, open and pull your first bowl on the wheel. Clay and glazes included.", instructor: "Chaminda Wijesinghe", locationId: north.id, startsAt: at(1, 10), endsAt: at(1, 12), capacity: 12, active: 11, cancelled: 2 },
    { code: "CODE-201", title: "Build Your First Website", description: "HTML and CSS basics. Bring a laptop.", instructor: "Ishara Gunasekara", locationId: town.id, startsAt: at(2, 18), endsAt: at(2, 20, 30), capacity: 20, active: 20, cancelled: 1, waitlisted: 2 },
    { code: "FIT-110", title: "Morning HIIT", description: "45 minutes of high-intensity intervals. All fitness levels.", instructor: "Ruwan Bandara", locationId: river.id, startsAt: at(3, 9), endsAt: at(3, 9, 45), capacity: 15, active: 6, cancelled: 1 },
    { code: "POT-205", title: "Glazing Techniques", description: "Dipping, brushing and layering glazes on bisque ware.", instructor: "Chaminda Wijesinghe", locationId: north.id, startsAt: at(4, 14), endsAt: at(4, 16), capacity: 10, active: 3 },
    { code: "FIT-150", title: "Yoga for Desk Workers", description: "Gentle stretches for neck, shoulders and back.", instructor: "Kavitha Sivakumar", locationId: river.id, startsAt: at(5, 18), endsAt: at(5, 19), capacity: 18, status: "CANCELLED", active: 0, cancelled: 4 },
    { code: "CODE-310", title: "Python for Spreadsheets", description: "Automate the boring parts of Excel with Python.", instructor: "Ishara Gunasekara", locationId: town.id, startsAt: at(8, 18), endsAt: at(8, 20), capacity: 16, active: 9 },
    { code: "ART-120", title: "Batik Printing Basics", description: "Wax resist, dyeing and layering colours on cotton. Materials included.", instructor: "Nadeesha de Silva", locationId: town.id, startsAt: at(10, 10), endsAt: at(10, 13), capacity: 14, active: 0 },
    { code: "FIT-101", title: "Intro to Strength Training", description: "Safe lifting form with kettlebells and dumbbells.", instructor: "Ruwan Bandara", locationId: river.id, startsAt: at(-3, 9), endsAt: at(-3, 10), capacity: 12, status: "COMPLETED", active: 10, cancelled: 1 },
  ];

  let n = 0;
  for (const w of workshops) {
    const { active, cancelled = 0, waitlisted = 0, ...data } = w;
    const row = await prisma.workshop.upsert({
      where: { code: data.code },
      update: {},
      create: { ...data, status: data.status ?? "SCHEDULED", createdById: manager.id, updatedById: manager.id },
    });
    if ((await prisma.registration.count({ where: { workshopId: row.id } })) > 0) continue;

    const seen = new Set<string>();
    const uniqueAttendee = () => {
      const a = attendee(n++);
      let email = a.attendeeEmail;
      for (let k = 2; seen.has(email); k++) email = a.attendeeEmail.replace("@", `${k}@`);
      seen.add(email);
      return { ...a, attendeeEmail: email };
    };
    const make = (status: RegistrationStatus, count: number, minutesAgo: number) =>
      Array.from({ length: count }, (_, i) => ({
        ...uniqueAttendee(),
        workshopId: row.id,
        status,
        registeredById: i % 3 === 0 ? manager.id : staff.id,
        registeredAt: new Date(Date.now() - (minutesAgo - i) * 60_000),
        ...(status === "CANCELLED" && {
          cancelledById: staff.id,
          cancelledAt: new Date(Date.now() - (minutesAgo / 2) * 60_000),
          cancelReason: "Called to cancel",
        }),
      }));

    await prisma.$transaction([
      prisma.registration.createMany({
        data: [...make("CANCELLED", cancelled, 3000), ...make("ACTIVE", active, 2000), ...make("WAITLISTED", waitlisted, 100)],
      }),
      // Keep the denormalised counter consistent with the rows we just wrote.
      prisma.workshop.update({ where: { id: row.id }, data: { activeCount: active } }),
    ]);
  }

  console.log(`Seeded: admin ${admin.email}, ${locations.length} locations, ${workshops.length} workshops.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
