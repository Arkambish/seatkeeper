/**
 * Live demo of the capacity rule over real HTTP. A manager creates a 10-seat
 * workshop, then N staff registrations are fired at the running server at the
 * same moment. Exactly 10 must succeed.
 *
 *   npm run dev            (in another terminal)
 *   npm run hammer         (BASE_URL=http://localhost:3000 REQUESTS=50 CAPACITY=10)
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const REQUESTS = Number(process.env.REQUESTS ?? 50);
const CAPACITY = Number(process.env.CAPACITY ?? 10);

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  return res.headers.get("set-cookie")!.split(";")[0];
}

async function main() {
  const [manager, staff] = await Promise.all([
    login("manager@example.com", "Manager123!"),
    login("staff@example.com", "Staff123!"),
  ]);
  const locations = (await (await fetch(`${BASE}/api/locations`, { headers: { cookie: manager } })).json()) as { id: string }[];

  const start = new Date(Date.now() + 2 * 86_400_000);
  const res = await fetch(`${BASE}/api/workshops`, {
    method: "POST",
    headers: { cookie: manager, "content-type": "application/json" },
    body: JSON.stringify({
      code: `RACE-${Date.now().toString(36).toUpperCase()}`,
      title: "Concurrency demo",
      instructor: "Load Test",
      locationId: locations[0].id,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      capacity: CAPACITY,
    }),
  });
  const workshop = (await res.json()) as { id: string; code: string };
  console.log(`Created ${workshop.code} with ${CAPACITY} seats. Firing ${REQUESTS} simultaneous registrations…`);

  const t0 = performance.now();
  const statuses = await Promise.all(
    Array.from({ length: REQUESTS }, (_, i) =>
      fetch(`${BASE}/api/workshops/${workshop.id}/registrations`, {
        method: "POST",
        headers: { cookie: staff, "content-type": "application/json" },
        body: JSON.stringify({ attendeeName: `Caller ${i}`, attendeeEmail: `caller${i}@example.com` }),
      }).then(async (r) => (r.ok ? "201 registered" : `${r.status} ${((await r.json()) as { error: { code: string } }).error.code}`)),
    ),
  );
  const ms = Math.round(performance.now() - t0);

  const tally = statuses.reduce<Record<string, number>>((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {});
  const detail = (await (await fetch(`${BASE}/api/workshops/${workshop.id}`, { headers: { cookie: staff } })).json()) as {
    activeCount: number;
  };
  console.table(tally);
  console.log(`Done in ${ms} ms. Seats taken: ${detail.activeCount}/${CAPACITY}.`);
  if (detail.activeCount !== CAPACITY || tally["201 registered"] !== CAPACITY) {
    console.error("FAIL: capacity rule violated");
    process.exit(1);
  }
  console.log("PASS: never over capacity.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
