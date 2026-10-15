/**
 * มือถือ (กว้าง 390px): ทุกหน้าต้องไม่ล้นจอจนต้องเลื่อนซ้าย-ขวา
 * ใช้ผู้ใช้จาก e2e/full-flow.mjs (admin เห็นทุกหน้า / หัวหน้าทีมมีรายการของตัวเอง)
 */
import { BASE, SHOTS, assert, browser, failOnPageErrors, watchErrors } from "./lib.mjs";

const W = 390;
async function login(email, password) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  watchErrors(page);
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill("#identifier", email);
    await page.fill("#password", password);
    await page.click("main button[type=submit]");
    await page.waitForURL(/dashboard/);
  }
  return page;
}

async function check(page, path, name) {
  await page.goto(`${BASE}${path}`);
  await page.waitForSelector("[aria-busy=true]", { state: "detached", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/mobile-${name}.png`, fullPage: true });
  assert(overflow <= 0, `mobile ${path}: no sideways scroll (overflow ${overflow}px)`);
}

const guest = await login();
for (const path of ["/login", "/register", "/forgot-password"]) await check(guest, path, `guest${path.replaceAll("/", "-")}`);

const admin = await login("admin@test.local", "Passw0rd123");
for (const path of ["/dashboard", "/ot-requests", "/ot-requests/new", "/ot-usages", "/ot-usages/new", "/calendar", "/approvals", "/overview", "/admin/users", "/admin/departments", "/admin/holidays", "/profile"]) {
  await check(admin, path, `admin${path.replaceAll("/", "-")}`);
}
const lead = await login("sup@test.local", "NewPassw0rd9"); // รหัสผ่านถูกเปลี่ยนในขั้น "ลืมรหัสผ่าน" ของ full-flow
for (const path of ["/dashboard", "/ot-requests", "/ot-usages", "/calendar"]) await check(lead, path, `lead${path.replaceAll("/", "-")}`);

failOnPageErrors();
console.log("\nALL MOBILE CHECKS PASSED");
await browser.close();
