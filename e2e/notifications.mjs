/**
 * ทดสอบ PWA + การแจ้งเตือน (ใช้ผู้ใช้จาก e2e/full-flow.mjs — รัน npm run test:e2e ก่อน)
 *  1. ไฟล์ PWA: manifest / ไอคอน / service worker / หน้า offline
 *  2. กระดิ่งแจ้งเตือน: เฉพาะหัวหน้า/admin, ตัวเลขถูกต้อง, อัปเดตเองเมื่อมีคำขอใหม่
 *  3. แจ้งเตือนที่มุมจอ (จากหน้าเว็บ) เมื่อมีคำขอใหม่ระหว่างดูแท็บอื่น
 *  4. Web Push จริง: เปิดแจ้งเตือน -> พนักงานยื่นคำขอ -> server ส่ง Push (เข้ารหัส) ไปที่ "บริการ Push จำลอง"
 *     -> ถอดรหัสแล้วตรวจข้อความ / อุปกรณ์ที่หมดอายุ (410) ถูกลบ / ปิดแจ้งเตือนแล้วลบอุปกรณ์
 *
 * ข้อ 4 เปิดเว็บอีกตัวที่พอร์ต 3100 เอง (ต้อง npm run build ไว้แล้ว และมี openssl) เพื่อให้เชื่อใบรับรองของบริการจำลอง
 */
import { execFileSync, spawn } from "node:child_process";
import { createECDH, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:https";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BASE, assert, browser, failOnPageErrors, log, sql, watchErrors } from "./lib.mjs";

const ece = createRequire(import.meta.url)("http_ece"); // มากับ web-push: ใช้ถอดรหัสข้อความ Push แบบเดียวกับเบราว์เซอร์

async function login(base, email, password = "Passw0rd123", options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await ctx.newPage();
  watchErrors(page);
  await page.goto(`${base}/login`);
  await page.fill("#identifier", email);
  await page.fill("#password", password);
  await page.click("main button[type=submit]");
  await page.waitForURL(/dashboard/);
  return { ctx, page };
}

const otherId = sql("select id from profiles where email='other@test.local'");
// รันซ้ำได้: ลบคำขอที่การทดสอบนี้เคยสร้างไว้ (กันเวลาซ้อนกับรอบก่อน)
sql(`delete from ot_requests where employee_id='${otherId}' and description in ('ทดสอบกระดิ่ง', 'ทดสอบ Push')`);
sql(`delete from push_subscriptions where endpoint like 'https://127.0.0.1:%'`); // อุปกรณ์จำลองของรอบก่อน
const insertPending = (date, start, end) =>
  sql(
    `insert into ot_requests (employee_id, request_date, work_date, period, start_time, end_time, description)
     values ('${otherId}', '${date}', '${date}', 'after_work', '${start}', '${end}', 'ทดสอบกระดิ่ง') returning id`,
  ).split("\n")[0];
const pendingForAdmin = () => Number(sql("select (select count(*) from ot_requests where status='pending' and employee_id <> (select id from profiles where email='admin@test.local')) + (select count(*) from ot_usages where status='pending' and employee_id <> (select id from profiles where email='admin@test.local'))"));

// =====================================================================
log("---- 1. ไฟล์ PWA ----");
const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
assert(manifest.display === "standalone" && manifest.start_url === "/dashboard" && manifest.icons.length >= 3, "manifest: standalone app with icons");
for (const icon of manifest.icons) {
  const r = await fetch(`${BASE}${icon.src}`);
  assert(r.ok && r.headers.get("content-type") === "image/png", `icon ${icon.src} (${icon.sizes}, ${icon.purpose})`);
}
const sw = await fetch(`${BASE}/sw.js`);
assert(sw.ok && /no-store/.test(sw.headers.get("cache-control") ?? ""), "sw.js served without cache (users always get updates)");

const { ctx: adminCtx, page: admin } = await login(BASE, "admin@test.local");
const swState = await admin
  .waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === "activated", null, { polling: 200, timeout: 10_000 })
  .then(() => "activated", () => "not active");
assert(swState === "activated", "service worker registered and active after login");
await adminCtx.setOffline(true);
await admin.goto(`${BASE}/ot-requests`).catch(() => {});
assert((await admin.locator("body").innerText()).includes("ไม่มีการเชื่อมต่ออินเทอร์เน็ต"), "offline navigation shows Thai offline page");
await adminCtx.setOffline(false);

// =====================================================================
log("---- 2. กระดิ่งแจ้งเตือน ----");
await admin.goto(`${BASE}/dashboard`);
const bell = admin.locator("[data-testid=notification-bell]:visible");
const before = pendingForAdmin();
assert((await bell.getAttribute("aria-label")).includes(before > 0 ? `${before} รายการ` : "การแจ้งเตือน"), `admin bell shows pending count (${before})`);

const { ctx: empCtx, page: emp } = await login(BASE, "other@test.local");
assert((await emp.locator("[data-testid=notification-bell]").count()) === 0, "employee has no bell");
const apiAsEmployee = await emp.request.get(`${BASE}/api/notifications`);
assert(apiAsEmployee.status() === 403, "employee cannot read /api/notifications");
await empCtx.close();

insertPending("2026-10-10", "18:00", "19:00");
await admin.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); // = ผู้ใช้กลับมาที่แท็บ -> เช็กใหม่
await admin.waitForFunction((n) => document.querySelector("[data-testid=notification-bell]")?.getAttribute("aria-label")?.includes(`${n} รายการ`), before + 1);
assert(true, "bell updates by itself when a new request arrives (no page reload)");
await bell.click();
const popover = admin.locator("[data-slot=popover-content]");
assert((await popover.innerText()).includes("คนอื่น") && (await popover.locator("[aria-label=ใหม่]").count()) >= 1, "bell list shows the new request marked as new");
await popover.getByRole("link", { name: "ไปหน้ารออนุมัติ" }).click();
await admin.waitForURL(/approvals/);
assert(true, "bell link opens the approvals page");
await adminCtx.close();

// =====================================================================
log("---- 3. แจ้งเตือนที่มุมจอ ขณะดูแท็บอื่น (จากหน้าเว็บเอง) ----");
{
  const { ctx, page } = await login(BASE, "admin@test.local", "Passw0rd123", { permissions: ["notifications"] });
  await page.clock.install();
  await page.goto(`${BASE}/dashboard`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // จำลองว่าผู้ใช้สลับไปดูแท็บอื่น
  await page.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, get: () => true }));
  insertPending("2026-10-11", "18:00", "19:00");
  await page.clock.runFor(61_000); // ครบรอบเช็ก 1 นาที
  // นาฬิกาในหน้าถูกหยุดไว้ (clock) จึงรอจากฝั่งสคริปต์แทน
  let shown = [];
  for (let i = 0; i < 30 && shown.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 300));
    shown = await page.evaluate(async () =>
      (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => `${n.title}|${n.body}`),
    );
  }
  assert(shown.some((t) => t.startsWith("คำขอทำ OT ใหม่รออนุมัติ|คนอื่น")), `system notification shown while tab hidden (${shown.join(", ")})`);
  await ctx.close();
}

// =====================================================================
log("---- 4. Web Push จาก server ----");
// ใบรับรองชั่วคราวให้ "บริการ Push จำลอง" ใช้ https ได้ (เหมือน Google/Apple ของจริง)
const dir = mkdtempSync(join(tmpdir(), "ot-push-"));
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1", "-keyout", join(dir, "key.pem"), "-out", join(dir, "cert.pem")], { stdio: "ignore" });

const received = [];
const pushService = createServer({ key: readFileSync(join(dir, "key.pem")), cert: readFileSync(join(dir, "cert.pem")) }, (req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    received.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks) });
    res.writeHead(req.url.includes("gone") ? 410 : 201).end(); // 410 = อุปกรณ์ถอนสิทธิ์แล้ว
  });
});
await new Promise((r) => pushService.listen(0, "127.0.0.1", r));
const pushOrigin = `https://127.0.0.1:${pushService.address().port}`;

// เปิดเว็บอีกตัว (พอร์ต 3100) ที่เชื่อใบรับรองของบริการจำลอง
const PUSH_BASE = "http://localhost:3100";
if (await fetch(`${PUSH_BASE}/login`).then(() => true, () => false)) {
  throw new Error("พอร์ต 3100 ถูกใช้อยู่ (อาจเป็นเว็บที่ค้างจากการทดสอบรอบก่อน) — ปิดก่อนแล้วรันใหม่");
}
// เรียก next โดยตรง + detached เพื่อปิดทั้งกลุ่มได้ตอนจบ (ถ้าผ่าน npx จะเหลือ server ค้างอยู่)
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3100"], {
  env: { ...process.env, NODE_EXTRA_CA_CERTS: join(dir, "cert.pem") },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
try {
  for (let i = 0; i < 60; i++) {
    if (await fetch(`${PUSH_BASE}/login`).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // กุญแจของ "เบราว์เซอร์จำลอง" (เบราว์เซอร์จริงสร้างเองตอนกดเปิดแจ้งเตือน)
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const authSecret = randomBytes(16);
  const fakeSubscription = {
    endpoint: `${pushOrigin}/push/admin-device`,
    expirationTime: null,
    keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: authSecret.toString("base64url") },
  };

  const { ctx, page } = await login(PUSH_BASE, "admin@test.local", "Passw0rd123", { permissions: ["notifications"] });
  // Chromium ทดสอบต่อบริการ Push ของ Google ไม่ได้ -> แทนที่ subscribe() ให้คืน "ที่อยู่" ของบริการจำลอง
  await page.addInitScript((sub) => {
    let current = null;
    const fake = { ...sub, toJSON: () => sub, unsubscribe: async () => { current = null; return true; } };
    PushManager.prototype.subscribe = async () => (current = fake);
    PushManager.prototype.getSubscription = async () => current;
  }, fakeSubscription);
  await page.goto(`${PUSH_BASE}/profile`);
  await page.getByRole("button", { name: "เปิดการแจ้งเตือน" }).click();
  await page.getByRole("button", { name: "ปิดการแจ้งเตือน" }).waitFor();
  const adminId = sql("select id from profiles where email='admin@test.local'");
  assert(sql(`select count(*) from push_subscriptions where user_id='${adminId}' and endpoint='${fakeSubscription.endpoint}'`) === "1", "turning on notifications saves this device for the admin");

  // อุปกรณ์เก่าที่หมดอายุแล้ว (บริการตอบ 410) ต้องถูกลบเมื่อส่งไม่ผ่าน
  sql(`insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('${adminId}', '${pushOrigin}/push/gone-device', '${fakeSubscription.keys.p256dh}', '${fakeSubscription.keys.auth}')`);

  // พนักงาน (ไม่มีหัวหน้า -> ผู้อนุมัติคือ admin) ยื่นคำขอผ่านหน้าเว็บ
  const { ctx: eCtx, page: e } = await login(PUSH_BASE, "other@test.local");
  await e.goto(`${PUSH_BASE}/ot-requests/new`);
  await e.click("#period-after_work");
  await e.click("#start_time");
  await e.getByRole("option", { name: "21:00", exact: true }).click();
  await e.click("#end_time");
  await e.getByRole("option", { name: "22:00", exact: true }).click();
  await e.fill("#description", "ทดสอบ Push");
  await e.click("main button[type=submit]");
  await e.waitForURL((u) => u.pathname === "/ot-requests");
  await eCtx.close();

  // ส่ง Push หลังตอบผู้ใช้แล้ว (after) -> รอได้ถึง 30 วินาที
  for (let i = 0; i < 120 && !received.some((r) => r.path === "/push/admin-device"); i++) await new Promise((r) => setTimeout(r, 250));
  const delivered = received.find((r) => r.path === "/push/admin-device");
  if (!delivered) console.log("server log:\n" + serverLog.slice(-3000));
  assert(Boolean(delivered), "server sent a Web Push to the approver's device");
  assert(/^vapid t=/.test(delivered.headers.authorization ?? "") && delivered.headers["content-encoding"] === "aes128gcm", "push is signed (VAPID) and encrypted (aes128gcm)");
  const payload = JSON.parse(ece.decrypt(delivered.body, { version: "aes128gcm", privateKey: ecdh, authSecret }).toString());
  assert(payload.title === "คำขอทำ OT ใหม่รออนุมัติ" && payload.body.includes("คนอื่น") && payload.url === "/approvals", `decrypted push content: ${payload.title} / ${payload.body}`);
  let goneLeft = "1";
  for (let i = 0; i < 40 && goneLeft !== "0"; i++) {
    await new Promise((r) => setTimeout(r, 250));
    goneLeft = sql(`select count(*) from push_subscriptions where endpoint = '${pushOrigin}/push/gone-device'`);
  }
  assert(received.some((r) => r.path === "/push/gone-device") && goneLeft === "0", "expired device (410) removed automatically");

  // ปิดแจ้งเตือน -> ลบอุปกรณ์นี้
  await page.getByRole("button", { name: "ปิดการแจ้งเตือน" }).click();
  await page.getByRole("button", { name: "เปิดการแจ้งเตือน" }).waitFor();
  assert(sql(`select count(*) from push_subscriptions where endpoint='${fakeSubscription.endpoint}'`) === "0", "turning off notifications removes this device");
  await ctx.close();
} finally {
  try {
    process.kill(-server.pid, "SIGTERM"); // ปิดทั้งกลุ่ม (next + server ลูก)
  } catch {
    server.kill();
  }
  pushService.close();
}

failOnPageErrors();
console.log("\nALL NOTIFICATION CHECKS PASSED");
await browser.close();
process.exit(0);
