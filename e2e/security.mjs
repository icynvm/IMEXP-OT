/**
 * ทดสอบความปลอดภัย: จำลองผู้ไม่หวังดีที่ "ข้ามหน้าเว็บ" แล้วยิงตรงไปที่ API ของ Supabase / เว็บ
 * ทุกข้อคาดหวังว่า "ถูกปฏิเสธ" — ถ้าข้อไหนผ่าน แปลว่ามีช่องโหว่
 *
 * สร้างผู้ใช้ทดสอบของตัวเอง (อีเมลสุ่ม) จึงรันซ้ำได้โดยไม่ต้อง reset ฐานข้อมูล
 * ต้องรัน: npx supabase start  +  npm run build && npm run start   (ดู e2e/README.md)
 */
import { createClient } from "@supabase/supabase-js";
import { ANON_KEY, BASE, SUPABASE_URL, assert, browser, failOnPageErrors, log, makePng, sql, watchErrors } from "./lib.mjs";

if (!ANON_KEY) throw new Error("ไม่พบ publishable key (ตั้ง SUPABASE_ANON_KEY หรือมีไฟล์ .env.local)");

const RUN = Date.now().toString(36).toUpperCase();
const PASSWORD = "Passw0rd123";
const anon = () => createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/** สมัครผ่าน API ตรง (ไม่ผ่านหน้าเว็บ) แล้วยืนยันอีเมลด้วย SQL */
async function makeUser(tag, extraMeta = {}) {
  const email = `sec-${tag}-${RUN}@test.local`.toLowerCase();
  const code = `S${tag}${RUN}`.toUpperCase().slice(0, 30);
  const { data, error } = await anon().auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { first_name: `ทดสอบ${tag}`, last_name: "ความปลอดภัย", employee_code: code, ...extraMeta } },
  });
  if (error) throw error;
  sql(`update auth.users set email_confirmed_at = now() where id = '${data.user.id}'`);
  const client = anon();
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, email, code, client };
}

/** คาดหวังว่าถูกปฏิเสธ: error หรือไม่ได้ข้อมูลเลย */
const denied = (res) => Boolean(res.error) || (Array.isArray(res.data) && res.data.length === 0) || res.data === null;

// =====================================================================
log("---- 1. ผู้ที่ยังไม่ login (anon) ----");
for (const table of ["profiles", "ot_requests", "ot_usages", "ot_usage_allocations", "ot_request_balances", "employee_ot_summary", "departments", "public_holidays"]) {
  assert(denied(await anon().from(table).select("*").limit(1)), `anon cannot read ${table}`);
}
assert(denied(await anon().rpc("leave_calendar", { p_from: "2026-01-01", p_to: "2026-12-31" })), "anon cannot read leave calendar");

// =====================================================================
log("---- 2. สมัครผ่าน API ตรง: แอบตั้งตัวเองเป็น admin / ข้อมูลผิดรูปแบบ ----");
const A = await makeUser("A", { role: "admin", is_active: true, supervisor_id: null });
assert(sql(`select role from profiles where id='${A.id}'`) === "employee", "signup metadata role=admin is ignored (role = employee)");
const dup = await anon().auth.signUp({
  email: `sec-dup-${RUN}@test.local`.toLowerCase(),
  password: PASSWORD,
  options: { data: { first_name: "ซ้ำ", last_name: "ซ้ำ", employee_code: A.code } },
});
assert(Boolean(dup.error), "signup with an existing employee code is rejected");
const bad = await anon().auth.signUp({
  email: `sec-bad-${RUN}@test.local`.toLowerCase(),
  password: PASSWORD,
  options: { data: { first_name: "x", last_name: "y", employee_code: "<script>" } },
});
assert(Boolean(bad.error), "signup with malformed employee code (<script>) is rejected");

const B = await makeUser("B");
const S = await makeUser("S");
sql(`update profiles set role='supervisor' where id='${S.id}'`);
sql(`update profiles set supervisor_id='${S.id}' where id='${A.id}'`);

// OT ของ B ที่อนุมัติแล้ว (ไว้ทดสอบว่า A แอบใช้ชั่วโมงของ B ไม่ได้)
const bReq = sql(
  `insert into ot_requests (employee_id, request_date, work_date, period, start_time, end_time, description, status, reviewed_at)
   values ('${B.id}', '2026-09-01', '2026-09-01', 'after_work', '18:00', '21:00', 'OT ของ B', 'approved', now()) returning id`,
).split("\n")[0];

// =====================================================================
log("---- 3. พนักงาน A: อ่าน/แก้ข้อมูลคนอื่น ----");
assert(denied(await A.client.from("profiles").select("*").eq("id", B.id)), "A cannot read B's profile");
assert(denied(await A.client.from("ot_requests").select("*").eq("employee_id", B.id)), "A cannot read B's OT requests");
assert(denied(await A.client.from("ot_request_balances").select("*").eq("employee_id", B.id)), "A cannot read B's balances (view)");
assert(Boolean((await A.client.from("ot_requests").insert({ employee_id: A.id, request_date: "2026-10-01", work_date: "2026-10-01", period: "after_work", start_time: "18:00", end_time: "20:00", description: "x", status: "approved" })).error), "A cannot INSERT directly (must use submit function)");
await A.client.from("profiles").update({ role: "admin" }).eq("id", A.id);
assert(sql(`select role from profiles where id='${A.id}'`) === "employee", "A cannot UPDATE own role directly");
await A.client.from("ot_requests").delete().eq("id", bReq);
assert(sql(`select count(*) from ot_requests where id='${bReq}'`) === "1", "A cannot DELETE others' rows");

log("---- 4. พนักงาน A: เรียกฟังก์ชันที่ไม่มีสิทธิ์ ----");
const { data: aReq } = await A.client.rpc("submit_ot_request", {
  p_request_date: "2026-10-01", p_work_date: "2026-10-01", p_period: "after_work", p_start_time: "18:00", p_end_time: "20:00", p_description: "OT ของ A",
});
assert(Boolean(aReq), "A can submit own OT request through the function");
assert(Boolean((await A.client.rpc("review_ot_request", { p_id: aReq, p_approve: true })).error), "A cannot approve own request");
assert(Boolean((await A.client.rpc("review_ot_request", { p_id: bReq, p_approve: false, p_note: "x" })).error), "A cannot review B's request");
assert(Boolean((await A.client.rpc("admin_update_user", { p_user_id: A.id, p_first_name: "a", p_last_name: "b", p_employee_code: A.code, p_role: "admin", p_supervisor_id: null, p_department_id: null, p_is_active: true })).error), "A cannot call admin_update_user");
assert(Boolean((await A.client.rpc("admin_save_holiday", { p_date: "2026-11-11", p_name: "แอบเพิ่ม" })).error), "A cannot add holidays");
assert(Boolean((await A.client.rpc("admin_save_department", { p_id: null, p_name: "แอบสร้าง", p_head_id: A.id })).error), "A cannot create departments");
assert(Boolean((await A.client.rpc("submit_ot_usage", { p_use_date: "2026-10-20", p_reason: "x", p_allocations: [{ ot_request_id: bReq, hours: 1 }] })).error), "A cannot spend B's OT hours");

log("---- 5. ข้อมูลผิดกฎ (ส่งตรงไม่ผ่าน zod) ----");
const req = (o) => A.client.rpc("submit_ot_request", { p_request_date: "2026-10-02", p_work_date: "2026-10-02", p_period: "after_work", p_start_time: "18:00", p_end_time: "20:00", p_description: "x", ...o });
assert(Boolean((await req({ p_request_date: "2099-01-01" })).error), "request date in the future is rejected");
assert(Boolean((await req({ p_start_time: "20:00", p_end_time: "18:00" })).error), "end before start is rejected");
assert(Boolean((await req({ p_start_time: "18:15", p_end_time: "20:00" })).error), "non-30-minute time is rejected");
assert(Boolean((await req({ p_period: "before_work", p_start_time: "08:00", p_end_time: "10:00" })).error), "before-work OT ending after 09:00 is rejected");
assert(Boolean((await req({ p_description: "ก".repeat(1001) })).error), "description longer than 1000 chars is rejected");
assert(Boolean((await req({ p_work_date: "2026-10-01", p_request_date: "2026-10-01", p_start_time: "19:00", p_end_time: "21:00" })).error), "overlapping OT on the same day is rejected");
sql(`update ot_requests set status='approved', reviewed_at=now() where id='${aReq}'`);
const submitUsage = (allocs) => A.client.rpc("submit_ot_usage", { p_use_date: "2026-10-20", p_reason: "x", p_allocations: allocs });
assert(Boolean((await submitUsage([{ ot_request_id: aReq, hours: 0.25 }])).error), "usage of 0.25h is rejected (must be 0.5 steps)");
assert(Boolean((await submitUsage([{ ot_request_id: aReq, hours: -1 }])).error), "negative usage is rejected");
assert(Boolean((await submitUsage([{ ot_request_id: aReq, hours: 3 }])).error), "usage above remaining balance is rejected");
assert(Boolean((await submitUsage([{ ot_request_id: aReq, hours: 1 }, { ot_request_id: aReq, hours: 1 }])).error), "same OT twice in one usage is rejected");
assert(denied(await A.client.rpc("leave_calendar", { p_from: "2020-01-01", p_to: "2030-12-31" })), "leave calendar refuses huge ranges (> ~2 years)");

log("---- 6. หัวหน้าทีม S: อนุมัติได้เฉพาะลูกทีม ----");
const { data: aReq2 } = await A.client.rpc("submit_ot_request", {
  p_request_date: "2026-10-03", p_work_date: "2026-10-03", p_period: "after_work", p_start_time: "18:00", p_end_time: "19:00", p_description: "รออนุมัติ",
});
assert(!(await S.client.rpc("review_ot_request", { p_id: aReq2, p_approve: true })).error, "S can approve own team member A");
const { data: bPending } = await B.client.rpc("submit_ot_request", {
  p_request_date: "2026-10-03", p_work_date: "2026-10-03", p_period: "after_work", p_start_time: "18:00", p_end_time: "19:00", p_description: "ของ B",
});
assert(Boolean((await S.client.rpc("review_ot_request", { p_id: bPending, p_approve: true })).error), "S cannot approve B (not in team)");
assert(Boolean((await S.client.rpc("review_ot_request", { p_id: aReq2, p_approve: false, p_note: "x" })).error), "already-reviewed request cannot be reviewed again");

log("---- 7. บัญชีที่ถูกปิดใช้งาน ----");
sql(`update profiles set is_active=false where id='${S.id}'`);
assert(denied(await S.client.from("ot_requests").select("*").eq("employee_id", A.id)), "deactivated supervisor can no longer read team data");
assert(Boolean((await S.client.rpc("submit_ot_request", { p_request_date: "2026-10-04", p_work_date: "2026-10-04", p_period: "after_work", p_start_time: "18:00", p_end_time: "19:00", p_description: "x" })).error), "deactivated user cannot submit");
sql(`update profiles set is_active=true where id='${S.id}'`);

log("---- 8. ที่เก็บรูปโปรไฟล์ (Storage) ----");
const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: "image/svg+xml" });
assert(Boolean((await A.client.storage.from("avatars").upload(`${A.id}/x.svg`, svg, { contentType: "image/svg+xml" })).error), "SVG (can carry scripts) is rejected");
const html = new Blob(["<script>alert(1)</script>"], { type: "text/html" });
assert(Boolean((await A.client.storage.from("avatars").upload(`${A.id}/x.html`, html, { contentType: "text/html" })).error), "HTML upload is rejected");
const big = new Blob([new Uint8Array(1.5 * 1024 * 1024)], { type: "image/png" });
assert(Boolean((await A.client.storage.from("avatars").upload(`${A.id}/big.png`, big, { contentType: "image/png" })).error), "file over 1 MB is rejected");
const png = new Blob([makePng(4, 4, [0, 0, 0])], { type: "image/png" });
assert(Boolean((await A.client.storage.from("avatars").upload(`${B.id}/x.png`, png, { contentType: "image/png" })).error), "upload into another user's folder is rejected");
assert(!(await A.client.storage.from("avatars").upload(`${A.id}/ok.png`, png, { contentType: "image/png" })).error, "upload of a small PNG into own folder works");
assert(Boolean((await B.client.storage.from("avatars").remove([`${A.id}/ok.png`])).error) || sql(`select count(*) from storage.objects where name='${A.id}/ok.png'`) === "1", "B cannot delete A's file");

// =====================================================================
log("---- 9. หน้าเว็บ (HTTP) ----");
const res = await fetch(`${BASE}/login`);
for (const h of ["x-frame-options", "x-content-type-options", "referrer-policy", "strict-transport-security", "permissions-policy"]) {
  assert(res.headers.has(h), `security header present: ${h}`);
}
assert(!res.headers.has("x-powered-by"), "no X-Powered-By header (hides framework)");
for (const path of ["/dashboard", "/admin/users", "/overview/export?type=balances", "/profile"]) {
  const r = await fetch(`${BASE}${path}`, { redirect: "manual" });
  assert(r.status >= 300 && r.status < 400 && (r.headers.get("location") ?? "").includes("/login"), `not logged in: ${path} -> /login`);
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
watchErrors(page);
// open redirect: ?next=//evil.com ต้องไม่พาออกนอกเว็บ
await page.goto(`${BASE}/login?next=${encodeURIComponent("//evil.example")}`);
await page.fill("#identifier", A.email);
await page.fill("#password", PASSWORD);
await page.click("main button[type=submit]");
await page.waitForURL((u) => u.pathname !== "/login");
assert(new URL(page.url()).host === new URL(BASE).host, `login ?next=//evil.example stays on site (${page.url()})`);
// พนักงานเปิด CSV / หน้า admin ไม่ได้
const csv = await page.request.get(`${BASE}/overview/export?type=balances`, { maxRedirects: 0 });
assert(csv.status() >= 300 && csv.status() < 400, "employee cannot download CSV export");
// หมายเหตุ: มี loading.tsx (skeleton) จึง redirect หลังหน้าเริ่มแสดง -> ต้องรอ URL เปลี่ยน
// และ HTML ที่ส่งมาต้องไม่มีข้อมูลผู้ใช้คนอื่นปนมา
const adminHtml = await (await page.request.get(`${BASE}/admin/users`)).text();
assert(!adminHtml.includes(B.email) && !adminHtml.includes(S.email), "employee requesting /admin/users gets no user data in the HTML");
await page.goto(`${BASE}/admin/users`);
await page.waitForURL((u) => u.pathname === "/dashboard", { timeout: 10000 });
assert(new URL(page.url()).pathname === "/dashboard", "employee opening /admin/users is sent to /dashboard");

// XSS: ข้อความที่มีโค้ด ต้องแสดงเป็นตัวอักษร ไม่ถูกรัน
const xss = `<img src=x onerror="window.__xss=1">`;
await A.client.rpc("submit_ot_request", { p_request_date: "2026-10-05", p_work_date: "2026-10-05", p_period: "after_work", p_start_time: "18:00", p_end_time: "19:00", p_description: xss });
await page.goto(`${BASE}/ot-requests`);
await page.waitForTimeout(800);
assert((await page.evaluate(() => window.__xss)) === undefined && (await page.locator("main").innerText()).includes(xss), "HTML in description is shown as text (no XSS)");
await ctx.close();

log("---- 10. เดารหัสผ่านซ้ำ ๆ (brute force) ----");
const attackCtx = await browser.newContext();
const ap = await attackCtx.newPage();
let blockedAt = 0;
for (let i = 1; i <= 12; i++) {
  await ap.goto(`${BASE}/login`);
  await ap.fill("#identifier", B.email);
  await ap.fill("#password", `wrong-${i}`);
  await ap.click("main button[type=submit]");
  const alert = ap.locator("main [data-slot=alert]").first();
  await alert.waitFor();
  if ((await alert.innerText()).includes("ผิดหลายครั้งเกินไป")) {
    blockedAt = i;
    break;
  }
}
assert(blockedAt > 0 && blockedAt <= 9, `brute force blocked after ${blockedAt - 1} wrong passwords`);
// ถูกบล็อกแล้ว แม้รหัสผ่านถูกก็ต้องรอ (กันเดาต่อจนถูก)
await ap.fill("#password", PASSWORD);
await ap.click("main button[type=submit]");
await ap.locator("main [data-slot=alert]").first().waitFor();
assert(new URL(ap.url()).pathname === "/login", "while blocked, even the correct password is refused");
// บัญชีเดียวกันจากเครื่อง/IP อื่นยังเข้าได้ (คนแกล้งกรอกผิดไม่ทำให้เจ้าของบัญชีถูกล็อก)
assert(!(await anon().auth.signInWithPassword({ email: B.email, password: PASSWORD })).error, "the account owner is not locked out on other connections");
await attackCtx.close();

log("---- 11. CSP / การสมัคร ----");
const loginRes = await fetch(`${BASE}/login`);
const csp = loginRes.headers.get("content-security-policy") ?? "";
const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
assert(/'nonce-[^']+'/.test(scriptSrc) && !scriptSrc.includes("unsafe-inline") && csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"), "CSP: scripts need a per-request nonce, no inline scripts, no framing");
const loginHtml = await loginRes.text();
const nonce = /'nonce-([^']+)'/.exec(scriptSrc)[1];
assert(loginHtml.includes(`nonce="${nonce}"`), "page scripts carry the CSP nonce");
assert(Boolean((await anon().auth.signUp({ email: `sec-weak-${RUN}@test.local`.toLowerCase(), password: "12345678", options: { data: { first_name: "a", last_name: "b", employee_code: `W${RUN}` } } })).error), "weak password (digits only) rejected even via API");
sql("update signup_settings set allowed_email_domains = '{company.test}'");
try {
  const outsider = await anon().auth.signUp({ email: `outsider-${RUN}@gmail.com`.toLowerCase(), password: PASSWORD, options: { data: { first_name: "a", last_name: "b", employee_code: `O${RUN}` } } });
  assert(Boolean(outsider.error), "signup from a non-company email domain is rejected (even via API)");
  const insider = await anon().auth.signUp({ email: `insider-${RUN}@company.test`.toLowerCase(), password: PASSWORD, options: { data: { first_name: "a", last_name: "b", employee_code: `I${RUN}` } } });
  assert(!insider.error, "signup with an allowed company domain works");
  assert(Boolean((await A.client.rpc("admin_set_signup_domains", { p_domains: [] })).error), "employee cannot change allowed signup domains");
  assert(denied(await A.client.from("auth_rate_limits").select("*")) && Boolean((await A.client.rpc("rate_limit_record", { p_keys: ["x"] })).error), "users cannot read or write rate-limit counters");
} finally {
  sql("update signup_settings set allowed_email_domains = '{}'");
}

failOnPageErrors();
console.log("\nALL SECURITY CHECKS PASSED");
await browser.close();
