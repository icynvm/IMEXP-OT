/**
 * จำลอง "ฐานข้อมูลล่ม": หยุด API ของ Supabase ในเครื่องชั่วคราว แล้วดูว่าผู้ใช้เห็นอะไร
 * คาดหวัง: หน้า "โหลดข้อมูลไม่สำเร็จ" ภาษาไทย (ไม่ค้าง ไม่เด้งวน login) และกด "ลองใหม่" แล้วกลับมาใช้ได้
 * ใช้ผู้ใช้จาก e2e/full-flow.mjs / ต้องมี docker (หยุด container ชื่อ supabase_rest_<project_id>)
 */
import { execFileSync } from "node:child_process";
import { BASE, assert, browser } from "./lib.mjs";

const CONTAINER = process.env.REST_CONTAINER ?? "supabase_rest_imexp-ot";
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/login`);
await page.fill("#identifier", process.env.PERF_EMAIL ?? "admin@test.local");
await page.fill("#password", process.env.PERF_PASSWORD ?? "Passw0rd123");
await page.click("main button[type=submit]");
await page.waitForURL(/dashboard/);

execFileSync("docker", ["stop", CONTAINER], { stdio: "ignore" });
try {
  const t0 = Date.now();
  await page.goto(`${BASE}/ot-requests`, { timeout: 60_000 });
  await page.getByText("โหลดข้อมูลไม่สำเร็จ").waitFor({ timeout: 45_000 });
  assert(new URL(page.url()).pathname === "/ot-requests", `database down -> Thai error page after ${Date.now() - t0} ms (no login redirect loop)`);
} finally {
  execFileSync("docker", ["start", CONTAINER], { stdio: "ignore" });
}
await new Promise((r) => setTimeout(r, 4000)); // รอ API กลับมาพร้อม
await page.getByRole("button", { name: "ลองใหม่" }).click();
await page.getByRole("heading", { name: "คำขอทำ OT" }).waitFor({ timeout: 30_000 });
assert(true, "after database is back, 'ลองใหม่' reloads the page data");
console.log("\nOUTAGE CHECK PASSED");
await browser.close();
