/**
 * วัดความเร็วแต่ละหน้า (หลัง login): เวลาที่ server ตอบ (TTFB), โหลดเสร็จ, และการกดเมนูเปลี่ยนหน้า
 * ใช้ผู้ใช้จาก e2e/full-flow.mjs (รัน npm run test:e2e ก่อน) — ตัวเลขในเครื่องใช้เทียบก่อน/หลังแก้เท่านั้น
 */
import { BASE, browser, log, watchErrors, failOnPageErrors } from "./lib.mjs";

const EMAIL = process.env.PERF_EMAIL ?? "admin@test.local";
const PASSWORD = process.env.PERF_PASSWORD ?? "Passw0rd123";
const PAGES = ["/dashboard", "/ot-requests", "/ot-requests/new", "/ot-usages", "/ot-usages/new", "/calendar", "/approvals", "/overview", "/admin/users", "/profile"];

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
watchErrors(page);
await page.goto(`${BASE}/login`);
await page.fill("#identifier", EMAIL);
await page.fill("#password", PASSWORD);
await page.click("main button[type=submit]");
await page.waitForURL(/dashboard/);

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log("\nหน้า                 TTFB(ms)  โหลดเสร็จ(ms)  (ค่ากลางจาก 3 ครั้ง)");
for (const path of PAGES) {
  const ttfb = [];
  const load = [];
  for (let i = 0; i < 3; i++) {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    const t = await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      return { ttfb: n.responseStart - n.requestStart, load: n.loadEventEnd - n.startTime };
    });
    ttfb.push(t.ttfb);
    load.push(t.load);
  }
  console.log(`${path.padEnd(20)} ${String(Math.round(median(ttfb))).padStart(8)}  ${String(Math.round(median(load))).padStart(12)}`);
}

// กดเมนู (เปลี่ยนหน้าในเว็บ ไม่โหลดใหม่ทั้งหน้า): เวลาจากกด -> เนื้อหาหน้าใหม่ขึ้น
console.log("\nกดเมนู -> เนื้อหาขึ้น (ms)");
await page.goto(`${BASE}/dashboard`);
for (const [label, path] of [["คำขอทำ OT", "/ot-requests"], ["ใช้ชั่วโมง OT", "/ot-usages"], ["ตารางวันหยุด", "/calendar"], ["หน้าหลัก", "/dashboard"]]) {
  const t0 = Date.now();
  const skeleton = page.locator("[aria-busy=true]");
  await page.locator("nav").getByRole("link", { name: label }).first().click();
  const sawSkeleton = await skeleton.first().waitFor({ timeout: 300 }).then(() => true, () => false);
  await page.waitForURL((u) => u.pathname === path);
  await page.waitForSelector("[aria-busy=true]", { state: "detached", timeout: 15000 }).catch(() => {});
  console.log(`${label.padEnd(16)} ${String(Date.now() - t0).padStart(6)}  ${sawSkeleton ? "(แสดง skeleton ระหว่างโหลด)" : ""}`);
}

failOnPageErrors();
log("OK", "perf run finished");
await browser.close();
