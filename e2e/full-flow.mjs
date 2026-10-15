/**
 * E2E: ใช้งานจริงตั้งแต่ผู้ใช้ใหม่สมัคร -> ยืนยันอีเมล -> admin ตั้งบทบาท/แผนก -> ขอทำ OT -> อนุมัติ
 *      -> ขอใช้ OT -> ภาพรวม/CSV -> ตารางวันหยุด -> วันหยุดนักขัตฤกษ์ -> ลืมรหัสผ่าน -> โปรไฟล์/รูป
 * ระหว่างทดสอบ ถ้าหน้าเว็บมี error (JavaScript / console / HTTP 5xx) จะถือว่าไม่ผ่าน
 *
 * ต้องใช้ฐานข้อมูลว่าง: npx supabase db reset ก่อนรันทุกครั้ง (ดู e2e/README.md)
 */
import { assert, browser, failOnPageErrors, makePng, sql, watchErrors, BASE, MAIL, SECRET_KEY, SHOTS, SUPABASE_URL } from "./lib.mjs";

async function newUser() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "th-TH" });
  const page = await ctx.newPage();
  watchErrors(page);
  return { ctx, page };
}

async function register(page, u) {
  await gotoReady(page, `${BASE}/register`);
  await page.fill("#first_name", u.first);
  await page.fill("#last_name", u.last);
  await page.fill("#email", u.email);
  await page.fill("#employee_code", u.code);
  await page.fill("#password", "Passw0rd123");
  await page.fill("#confirm_password", "Passw0rd123");
  await page.click("main button[type=submit]");
  await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
}

async function confirmLink(email) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`).then((r) => r.json());
    if (res.messages?.length) {
      const msg = await fetch(`${MAIL}/api/v1/message/${res.messages[0].ID}`).then((r) => r.json());
      const m = (msg.Text || msg.HTML).match(/https?:\/\/[^\s"<>)]+(?:verify|auth\/confirm)[^\s"<>)]+/);
      return m[0].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("no mail for " + email);
}

async function login(page, email) {
  await gotoReady(page, `${BASE}/login`);
  await page.fill("#identifier", email);
  await page.fill("#password", "Passw0rd123");
  await page.click("main button[type=submit]");
  await page.waitForURL(/dashboard/);
}
async function pick(page, triggerSel, optionName) {
  await page.click(triggerSel);
  await page.getByRole("option", { name: optionName, exact: true }).click();
}
async function closeFlash(page) {
  const ok = page.getByRole("button", { name: "ตกลง" });
  if (await ok.isVisible().catch(() => false)) { await ok.click(); await ok.waitFor({ state: "hidden" }); }
}
async function confirmIn(page, triggerName, confirmName, nth = 0) {
  await page.getByRole("button", { name: triggerName, exact: true }).nth(nth).click();
  await page.getByRole("alertdialog").getByRole("button", { name: confirmName }).click();
}
async function waitFlash(page, path) {
  await page.waitForURL((u) => u.pathname === "/" + path && !u.search.includes("message"));
  await page.getByRole("dialog").getByText(/สำเร็จ|เกิดข้อผิดพลาด/).first().waitFor();
}
async function gotoReady(page, url) {
  await page.goto(url);
  // รอให้ skeleton (loading.tsx) หายและเนื้อหาจริงโหลดเสร็จ
  await page.waitForSelector("[aria-busy=true]", { state: "detached", timeout: 15000 }).catch(() => {});
}
const TH_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const thMonth = (d) => `${TH_MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(0, 4)) + 543}`;
/** รอจนชื่อเดือนบนหัวปฏิทินตรงเงื่อนไข */
async function waitLabel(el, ok, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (ok((await el.innerText()).trim())) return; await new Promise((r) => setTimeout(r, 50)); }
  throw new Error("calendar label did not update: " + (await el.innerText()));
}
/** เลือกวันที่ผ่าน DatePicker (CalendarJS ใน popover) */
async function pickDate(page, id, date) {
  await page.click(`#${id}`);
  const pop = page.locator("[data-slot=popover-content]");
  await pop.waitFor();
  const labelEl = pop.locator("[data-calendar-label]").first();
  for (let i = 0; i < 30; i++) {
    const label = (await labelEl.innerText()).trim();
    if (label === thMonth(date)) break;
    const [ly, lm] = [Number(label.split(" ")[1]) - 543, TH_MONTHS.indexOf(label.split(" ")[0]) + 1];
    const forward = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) > ly * 12 + lm;
    await pop.getByRole("button", { name: forward ? "เดือนถัดไป" : "เดือนก่อน" }).click();
    await waitLabel(labelEl, (t) => t !== label); // ชื่อเดือนอัปเดตหลังปฏิทินเปลี่ยนเล็กน้อย
  }
  await pop.locator(".lm-calendar-content > div[data-grey=false]", { hasText: new RegExp(`^${Number(date.slice(8))}$`) }).click();
  await pop.waitFor({ state: "detached" });
}
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

// ---------- 1. register 3 users ----------
const users = {
  admin: { first: "อดมิน", last: "ระบบ", email: "admin@test.local", code: "ADM01" },
  sup: { first: "สมหญิง", last: "หัวหน้า", email: "sup@test.local", code: "SUP01" },
  emp: { first: "สมชาย", last: "ใจดี", email: "emp@test.local", code: "emp01" },
};
const S = {};
for (const [k, u] of Object.entries(users)) {
  S[k] = await newUser();
  await register(S[k].page, u);
  if (k === "admin") await shot(S[k].page, "01-after-register");
  await waitFlash(S[k].page, "login");
  assert(S[k].page.url() === `${BASE}/login`, `${k} registered -> clean /login URL + success dialog`);
}

// duplicate employee code
{
  const { page } = await newUser();
  await register(page, { first: "a", last: "b", email: "dup@test.local", code: "EMP01" });
  assert((await page.content()).includes("รหัสพนักงานนี้ถูกใช้สมัครแล้ว"), "duplicate employee code rejected");
  // validation errors
  await gotoReady(page, `${BASE}/register`);
  await page.fill("#first_name", "x"); await page.fill("#last_name", "y");
  await page.fill("#email", "v@test.local"); await page.fill("#employee_code", "V1");
  await page.fill("#password", "abcdefgh"); await page.fill("#confirm_password", "zzz");
  await page.click("main button[type=submit]"); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  const html = await page.content();
  assert(html.includes("รหัสผ่านต้องมีตัวเลข") && html.includes("ไม่ตรงกัน"), "password validation messages shown");
  assert((await page.inputValue("#email")) === "v@test.local", "form keeps values after error");
}

// login before confirm
await gotoReady(S.emp.page, `${BASE}/login`);
await S.emp.page.fill("#identifier", users.emp.email); await S.emp.page.fill("#password", "Passw0rd123");
await S.emp.page.click("main button[type=submit]"); await S.emp.page.waitForLoadState("networkidle"); await S.emp.page.waitForTimeout(1500);
assert((await S.emp.page.content()).includes("กรุณายืนยันอีเมล"), "unconfirmed login blocked");

// อีเมลยืนยันใช้แม่แบบใหม่ + ลิงก์ token_hash (เปิดจากเครื่องไหนก็ได้)
{
  const res = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent('to:"emp@test.local"')}`).then((r) => r.json());
  const msg = await fetch(`${MAIL}/api/v1/message/${res.messages[0].ID}`).then((r) => r.json());
  assert(msg.HTML.includes("IMPACT ORGANIZER") && msg.HTML.includes("ยืนยันอีเมลของคุณ") && /token_hash=[^&"]+&amp;type=email/.test(msg.HTML), "confirmation email uses new template with token_hash link");
}
// confirm via email link (token_hash, any device)
for (const k of Object.keys(users)) {
  const link = await confirmLink(users[k].email);
  if (k === "admin") S[k] = await newUser(); // เปิดลิงก์จาก "อีกเครื่อง" (ไม่มี cookie เดิม)
  await S[k].page.goto(link);
  await S[k].page.waitForLoadState("networkidle");
  assert(S[k].page.url().endsWith("/dashboard"), `${k} confirmed email -> dashboard (${S[k].page.url()})`);
}
assert(sql("select string_agg(employee_code||':'||role, ',' order by employee_code) from profiles") === "ADM01:employee,EMP01:employee,SUP01:employee", "profiles created as employee, code uppercased");

// ลิงก์แบบเดิม (?code=) เปิดจากอีกเครื่อง: ยืนยันสมัคร -> แจ้งให้ login ได้เลย / ตั้งรหัสผ่าน -> แจ้งให้ขอลิงก์ใหม่
{
  const x = (await newUser()).page;
  await gotoReady(x, `${BASE}/auth/confirm?code=11111111-2222-3333-4444-555555555555&next=/dashboard`);
  await waitFlash(x, "login");
  assert((await x.getByRole("dialog").innerText()).includes("ยืนยันอีเมลเรียบร้อยแล้ว"), "PKCE link opened on another device -> 'confirmed, please log in'");
  await gotoReady(x, `${BASE}/auth/confirm?code=11111111-2222-3333-4444-555555555555&next=/auth/reset-password`);
  await waitFlash(x, "login");
  assert((await x.getByRole("dialog").innerText()).includes("เบราว์เซอร์เดียวกับที่กดขอ"), "PKCE recovery link on another device -> clear message");
}

// ---------- 2. bootstrap admin & setup via UI ----------
sql("update public.profiles set role='admin' where email='admin@test.local'");
await gotoReady(S.admin.page, `${BASE}/admin/users`);
await shot(S.admin.page, "02-admin-users");
const supId = sql("select id from profiles where email='sup@test.local'");
const empId = sql("select id from profiles where email='emp@test.local'");
const adminId = sql("select id from profiles where email='admin@test.local'");
await gotoReady(S.admin.page, `${BASE}/admin/users/${supId}`);
await pick(S.admin.page, "#role", "หัวหน้าทีม");
await S.admin.page.click("main button[type=submit]");
await waitFlash(S.admin.page, "admin/users");
await gotoReady(S.admin.page, `${BASE}/admin/users/${empId}`);
await S.admin.page.click("#supervisor_id"); await S.admin.page.getByRole("option", { name: /SUP01/ }).click();
await S.admin.page.click("main button[type=submit]");
await waitFlash(S.admin.page, "admin/users");
assert(sql(`select role||':'||coalesce((select employee_code from profiles s where s.id=p.supervisor_id),'') from profiles p where id='${empId}'`) === "employee:SUP01", "admin set emp supervisor via UI");
assert(sql(`select role from profiles where id='${supId}'`) === "supervisor", "admin promoted sup via UI");

// admin cannot demote self (UI disables, try via hidden?)
await gotoReady(S.admin.page, `${BASE}/admin/users/${adminId}`);
assert(await S.admin.page.isDisabled("#role"), "admin self-role select disabled");

// employee cannot open admin / approvals pages
await gotoReady(S.emp.page, `${BASE}/admin/users`);
await S.emp.page.waitForURL(/\/dashboard$/);
assert(S.emp.page.url().endsWith("/dashboard"), "employee redirected away from /admin/users");
await gotoReady(S.emp.page, `${BASE}/approvals`);
await S.emp.page.waitForURL(/\/dashboard$/);
assert(S.emp.page.url().endsWith("/dashboard"), "employee redirected away from /approvals");
const csv = await S.emp.page.request.get(`${BASE}/overview/export?type=balances`, { maxRedirects: 0 });
assert(csv.status() === 307 || csv.status() === 303 || (await csv.text()).indexOf("รหัสพนักงาน") === -1, "employee cannot export CSV");

// ---------- 3. employee requests OT ----------
const p = S.emp.page;
await gotoReady(p, `${BASE}/ot-requests/new`);
await pickDate(p, "request_date", "2026-10-01");
await pickDate(p, "work_date", "2026-10-01");
await p.click("#period-after_work");
await pick(p, "#start_time", "18:00");
await pick(p, "#end_time", "21:30");
assert((await p.innerText("[data-testid=hours]")).includes("3.5 ชม."), "live hours calc shows 3.5");
await p.fill("#description", "ปิดงบประจำเดือน");
await shot(p, "03-ot-request-form");
await p.click("main button[type=submit]");
await waitFlash(p, "ot-requests");

await gotoReady(p, `${BASE}/ot-requests/new`);
await pickDate(p, "request_date", "2026-10-02"); await pickDate(p, "work_date", "2026-10-02");
await p.click("#period-before_work");
await pick(p, "#start_time", "07:00"); await pick(p, "#end_time", "09:00");
await p.fill("#description", "เตรียมเอกสาร");
await p.click("main button[type=submit]"); await waitFlash(p, "ot-requests");

// overlap -> error shown, form keeps description
await gotoReady(p, `${BASE}/ot-requests/new`);
await pickDate(p, "request_date", "2026-10-01"); await pickDate(p, "work_date", "2026-10-01");
await p.click("#period-after_work");
await pick(p, "#start_time", "20:00"); await pick(p, "#end_time", "22:00");
await p.fill("#description", "ซ้อน");
await p.click("main button[type=submit]"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
assert((await p.locator("body").innerText()).includes("ซ้อนกับคำขอ OT เดิม"), "overlapping request rejected with Thai message");
assert((await p.innerText("#start_time")).includes("20:00") && (await p.inputValue("#description")) === "ซ้อน", "form keeps chosen time + text after server error");

// third request, will be cancelled
await gotoReady(p, `${BASE}/ot-requests/new`);
await pickDate(p, "work_date", "2026-10-03");
await p.fill("#description", "จะยกเลิก");
await p.click("main button[type=submit]"); await waitFlash(p, "ot-requests");
await closeFlash(p);
await confirmIn(p, "ยกเลิก", "ยืนยันการยกเลิก");
await waitFlash(p, "ot-requests");
await shot(p, "04b-cancel-flash");
await closeFlash(p);
assert(sql("select count(*) from ot_requests where status='cancelled'") === "1", "employee cancelled pending request");
await shot(p, "04-ot-requests-list");

// ---------- 4. supervisor approves ----------
const sp = S.sup.page;
await gotoReady(sp, `${BASE}/approvals`);
await shot(sp, "05-approvals");
assert((await sp.getByRole("button", { name: "อนุมัติ", exact: true }).count()) === 2, "supervisor sees 2 pending requests");
// reject without note -> error
await confirmIn(sp, "ไม่อนุมัติ", "ยืนยันไม่อนุมัติ");
await sp.getByText("กรุณาระบุเหตุผลที่ไม่อนุมัติ").waitFor();
await shot(sp, "05b-reject-dialog");
assert(true, "reject requires note");
await sp.getByRole("alertdialog").getByRole("button", { name: "ปิด" }).click();
await confirmIn(sp, "อนุมัติ", "ยืนยันอนุมัติ");
await waitFlash(sp, "approvals");
await shot(sp, "05c-approve-flash");
await closeFlash(sp);
await confirmIn(sp, "อนุมัติ", "ยืนยันอนุมัติ");
await waitFlash(sp, "approvals");
await closeFlash(sp);
assert(sql("select count(*) from ot_requests where status='approved'") === "2", "supervisor approved 2 requests");

// ---------- 5. employee uses OT ----------
await gotoReady(p, `${BASE}/dashboard`);
assert((await p.locator("body").innerText()).includes("5.5 ชม."), "dashboard shows 5.5h remaining");
await shot(p, "06-dashboard");
// ชื่อผู้อนุมัติ: แม้ผู้อนุมัติไม่ใช่หัวหน้าโดยตรง (เช่น admin) พนักงานก็เห็นชื่อ
await gotoReady(p, `${BASE}/ot-requests`);
assert((await p.locator("main").innerText()).includes("โดย สมหญิง หัวหน้า"), "employee sees approver name (supervisor)");
sql("update ot_requests set reviewed_by=(select id from profiles where email='admin@test.local') where work_date='2026-10-01' and employee_id=(select id from profiles where email='emp@test.local')");
await gotoReady(p, `${BASE}/ot-requests`);
assert((await p.locator("main").innerText()).includes("โดย อดมิน ระบบ"), "employee sees approver name (admin, not own supervisor)");
sql("update ot_requests set reviewed_by=(select id from profiles where email='sup@test.local') where work_date='2026-10-01' and employee_id=(select id from profiles where email='emp@test.local')");
await gotoReady(p, `${BASE}/ot-usages/new`);
const submitBtn = p.locator("main button[type=submit]");
// เกินยอดที่มี -> แจ้งทันที + กดส่งไม่ได้
await p.fill("#wanted", "10");
assert((await p.locator("main").innerText()).includes("ชั่วโมงไม่พอ: ใช้ได้สูงสุด 5.5 ชม.") && await submitBtn.isDisabled(), "over available -> instant error, submit disabled");
// กรอกช่องเดียว -> ระบบแบ่งให้ทันที (เก่าสุดก่อน) ไม่ต้องกดปุ่ม
await p.fill("#wanted", "4");
const preview = await p.locator("main").innerText();
assert(preview.includes("ใช้ 3.5 ชม.") && preview.includes("ใช้ 0.5 ชม.") && preview.includes("เหลือ 1.5 ชม.") && (await submitBtn.innerText()) === "ส่งคำขอใช้ 4 ชม.", "typing hours auto-splits oldest first with preview");
// เลือกเอง: ตารางเริ่มจากตัวเลขที่ระบบแบ่ง / ข้ามวันแรกได้
await p.getByRole("button", { name: "เลือกเองว่าจะตัดจาก OT วันไหน" }).click();
const rows = p.locator("input[type=number][name^='alloc:']");
assert((await rows.nth(0).inputValue()) === "3.5" && (await rows.nth(1).inputValue()) === "0.5", "manual mode prefilled from auto split");
await rows.nth(0).fill(""); await rows.nth(1).fill("2");
assert((await submitBtn.innerText()) === "ส่งคำขอใช้ 2 ชม.", "manual: skip first OT, use 2h from second");
await p.getByRole("button", { name: "กลับไปให้ระบบแบ่งให้" }).click();
assert((await p.inputValue("#wanted")) === "2", "back to auto keeps manual total");
await p.fill("#wanted", "4");
assert((await submitBtn.innerText()) === "ส่งคำขอใช้ 4 ชม.", "auto allocate 4h");
await p.fill("#reason", "ลากิจครึ่งวัน");
await pickDate(p, "use_date", "2026-10-09");
await shot(p, "07-usage-form");
await p.click("main button[type=submit]"); await waitFlash(p, "ot-usages");
assert(sql("select string_agg(a.hours::text, ',' order by r.work_date) from ot_usage_allocations a join ot_requests r on r.id=a.ot_request_id") === "3.50,0.50", "FIFO allocation 3.5 + 0.5");
await gotoReady(p, `${BASE}/dashboard`);
assert((await p.locator("body").innerText()).includes("1.5 ชม."), "remaining after reservation 1.5h");

// over-use attempt (manual 2h on 1.5h)
await gotoReady(p, `${BASE}/ot-usages/new`);
await p.getByRole("button", { name: "เลือกเองว่าจะตัดจาก OT วันไหน" }).click();
const inputs = p.locator("input[type=number][name^='alloc:']");
await inputs.first().evaluate((el) => el.removeAttribute("max")); // bypass browser limit to hit server check
await inputs.first().fill("2");
await p.click("main button[type=submit]"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
assert((await p.locator("body").innerText()).includes("ชั่วโมงไม่พอ"), "over-use rejected");

// ---------- 6. supervisor approves usage; overview & CSV ----------
await gotoReady(sp, `${BASE}/approvals`);
await confirmIn(sp, "อนุมัติ", "ยืนยันอนุมัติ");
await waitFlash(sp, "approvals");
assert(sql("select status from ot_usages") === "approved", "usage approved");
await gotoReady(sp, `${BASE}/overview?month=2026-10`);
await shot(sp, "08-overview");
const ov = await sp.locator("body").innerText();
assert(ov.includes("EMP01") && ov.includes("5.5 ชม.") && ov.includes("1.5 ชม."), "overview shows team balances");
const csvRes = await sp.request.get(`${BASE}/overview/export?type=requests&month=2026-10`);
const csvText = await csvRes.text();
assert(csvRes.headers()["content-type"].includes("text/csv") && csvText.includes("ปิดงบประจำเดือน"), "CSV export works");

// admin overview sees everyone
await gotoReady(S.admin.page, `${BASE}/overview`);
assert((await S.admin.page.locator("body").innerText()).includes("SUP01"), "admin overview lists all users");

// ---------- 6b. departments, department head, auto-approval, leave calendar ----------
const SECRET = SECRET_KEY; // จาก .env.local (ห้ามเขียน key ลงในโค้ด)
if (!SECRET) throw new Error("ไม่พบ SUPABASE_SECRET_KEY (ตั้งใน .env.local)");
async function adminCreateUser(email, first, code) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Passw0rd123", email_confirm: true, user_metadata: { first_name: first, last_name: "ทดสอบ", employee_code: code } }),
  });
  if (!r.ok) throw new Error("create user failed " + (await r.text()));
}
await adminCreateUser("dh@test.local", "หัวหน้าแผนก", "DH001");
await adminCreateUser("other@test.local", "คนอื่น", "OTH01");
const dhId = sql("select id from profiles where email='dh@test.local'");
const ap = S.admin.page;
// admin: set role department_head via UI
await gotoReady(ap, `${BASE}/admin/users/${dhId}`);
await pick(ap, "#role", "หัวหน้าแผนก");
await ap.click("main button[type=submit]");
await waitFlash(ap, "admin/users");
assert(sql(`select role from profiles where id='${dhId}'`) === "department_head", "admin set department_head role via UI");
// admin: create department with head via dialog
await gotoReady(ap, `${BASE}/admin/departments`);
await ap.getByRole("button", { name: "สร้างแผนก" }).click();
await ap.getByRole("dialog").locator("input[name=name]").fill("บัญชี");
await ap.getByRole("dialog").locator("#dept-head-new").click();
await ap.getByRole("option", { name: /DH001/ }).click();
await shot(ap, "12-department-dialog");
await ap.getByRole("dialog").getByRole("button", { name: "บันทึก" }).click();
await waitFlash(ap, "admin/departments");
assert(sql("select d.name || ':' || p.employee_code from departments d join profiles p on p.id=d.head_id") === "บัญชี:DH001", "department created with head");
// admin: put sup + emp into department
for (const id of [supId, empId]) {
  await gotoReady(ap, `${BASE}/admin/users/${id}`);
  await ap.click("#department_id");
  await ap.getByRole("option", { name: "บัญชี" }).click();
  await ap.click("main button[type=submit]");
  await waitFlash(ap, "admin/users");
}
assert(sql("select count(*) from profiles where department_id is not null") === "3", "sup + emp + head in department");
await gotoReady(ap, `${BASE}/admin/users?dept=${sql("select id from departments limit 1")}`);
assert((await ap.locator("main tbody tr").count()) === 3, "admin filters users by department");
await shot(ap, "13-admin-users-dept");

// department head: sees team lead + employee, approvals menu
const dh = (await newUser()).page;
await login(dh, "dh@test.local");
await gotoReady(dh, `${BASE}/overview?month=2026-10`);
const dhText = await dh.locator("main").innerText();
assert(dhText.includes("ภาพรวมแผนก") && dhText.includes("EMP01") && dhText.includes("SUP01") && !dhText.includes("OTH01"), "department head overview: team lead + employee, not others");
assert((await dh.locator("main").innerText()).includes("ตุลาคม 2569"), "overview month shows Thai month name");
await shot(dh, "14-dept-head-overview");

// team lead submits own OT -> auto-approved
await gotoReady(sp, `${BASE}/ot-requests/new`);
await pickDate(sp, "request_date", "2026-10-05"); await pickDate(sp, "work_date", "2026-10-05");
await sp.fill("#description", "หัวหน้าทำเอง");
await sp.click("main button[type=submit]");
await waitFlash(sp, "ot-requests");
assert((await sp.getByRole("dialog").innerText()).includes("อนุมัติให้อัตโนมัติ"), "team lead sees auto-approve message");
assert(sql("select status from ot_requests where description='หัวหน้าทำเอง'") === "approved", "team lead request auto-approved in DB");

// leave calendar (CalendarJS): everyone sees who is off; only managers can open details
const dayCell = (page, day) => page.locator("main .lm-calendar-content > div[data-grey=false]", { hasText: new RegExp(`^${day}$`) });
const other = (await newUser()).page;
await login(other, "other@test.local");
await gotoReady(other, `${BASE}/calendar`);
const mainText = await other.locator("main").innerText();
assert(mainText.includes("ตุลาคม 2569"), "calendar shows Thai month + BE year");
await other.locator("main [data-holiday=true]").first().waitFor();
assert(await dayCell(other, 13).getAttribute("data-holiday") === "true", "13 Oct marked as public holiday");
assert(await dayCell(other, 9).getAttribute("data-leave") === "true", "9 Oct marked as someone off");
await dayCell(other, 13).click();
assert((await other.locator("main").innerText()).includes("วันนวมินทรมหาราช"), "holiday name shown for selected day");
await dayCell(other, 9).click();
const dayText = await other.locator("main").innerText();
assert(dayText.includes("สมชาย ใจดี") && !dayText.includes("ลากิจครึ่งวัน") && !dayText.includes("เฉพาะหัวหน้า"), "employee sees who is off, no details, no notice");
await other.getByText("สมชาย ใจดี", { exact: true }).first().click();
await other.waitForTimeout(500);
assert((await other.getByRole("dialog").count()) === 0, "employee clicking a person opens nothing");
await shot(other, "15-calendar-employee");
// month switch is instant (client-side) via month select
const t0 = Date.now();
await other.locator("[data-calendar-label]").click();
await other.locator(".lm-calendar-content > div[data-label='ธ.ค.']").click();
await waitLabel(other.locator("[data-calendar-label]"), (t) => t === "ธันวาคม 2569");
await dayCell(other, 7).waitFor();
assert(await dayCell(other, 7).getAttribute("data-holiday") === "true" && Date.now() - t0 < 3000, `month select -> ธันวาคม instantly (${Date.now() - t0}ms), 7 Dec holiday`);
assert((await other.locator("main").innerText()).includes("วันรัฐธรรมนูญ"), "month list shows holidays of selected month");
await shot(other, "15b-calendar-december");
// เลือกปีโดยไม่ใช้ dropdown: กดชื่อเดือน -> กดปี -> 2570 -> ม.ค.
await other.locator("[data-calendar-label]").click();
await waitLabel(other.locator("[data-calendar-label]"), (t) => t === "2569");
await other.locator("[data-calendar-label]").click();
await other.locator(".lm-calendar-content > div[data-label='2570']").click();
await other.locator(".lm-calendar-content > div[data-label='ม.ค.']").click();
await waitLabel(other.locator("[data-calendar-label]"), (t) => t === "มกราคม 2570");
await dayCell(other, 1).waitFor();
assert((await other.locator("[data-calendar-label]").innerText()).trim() === "มกราคม 2570" && await dayCell(other, 1).getAttribute("data-holiday") === "true", "year+month grid -> มกราคม 2570, 1 Jan holiday");

await gotoReady(sp, `${BASE}/calendar`);
await dayCell(sp, 9).click();
await sp.getByText("สมชาย ใจดี", { exact: true }).first().click();
assert((await sp.getByRole("dialog").innerText()).includes("ลากิจครึ่งวัน"), "team lead opens leave details of own team");
await shot(sp, "16-calendar-teamlead");
await gotoReady(dh, `${BASE}/calendar`);
await dayCell(dh, 9).click();
await dh.getByText("สมชาย ใจดี", { exact: true }).first().click();
assert((await dh.getByRole("dialog").innerText()).includes("ลากิจครึ่งวัน"), "department head opens leave details in department");

// admin manages public holidays
await gotoReady(ap, `${BASE}/admin/holidays?year=2026`);
assert((await ap.locator("main tbody tr").count()) === 22, "2569 has 22 seeded holidays");
await ap.getByRole("button", { name: "เพิ่มวันหยุด" }).click();
await pickDate(ap, "holiday_date", "2026-11-20");
await ap.getByRole("dialog").locator("input[name=name]").fill("วันหยุดบริษัท");
await ap.getByRole("dialog").getByRole("button", { name: "บันทึก" }).click();
await waitFlash(ap, "admin/holidays");
assert(sql("select name from public_holidays where holiday_date='2026-11-20'") === "วันหยุดบริษัท", "admin added a holiday via CalendarJS date picker");
await closeFlash(ap);
await ap.locator("main tr", { hasText: "วันหยุดบริษัท" }).getByRole("button", { name: "ลบ" }).click();
await ap.getByRole("alertdialog").getByRole("button", { name: "ยืนยันการลบ" }).click();
await waitFlash(ap, "admin/holidays");
assert(sql("select count(*) from public_holidays where holiday_date='2026-11-20'") === "0", "admin deleted the holiday");

// ---------- 7. deactivate employee ----------
await gotoReady(S.admin.page, `${BASE}/admin/users/${empId}`);
await S.admin.page.click("#is_active");
await S.admin.page.click("main button[type=submit]");
await waitFlash(S.admin.page, "admin/users");
await gotoReady(p, `${BASE}/dashboard`);
assert(p.url().includes("/auth/inactive"), "deactivated user sent to inactive page");

// ---------- 8. forgot password flow ----------
const fp = (await newUser()).page;
await gotoReady(fp, `${BASE}/forgot-password`);
await fp.fill("#email", users.sup.email);
await fp.click("main button[type=submit]"); await fp.waitForLoadState("networkidle"); await fp.waitForTimeout(1500);
assert((await fp.content()).includes("หากอีเมลนี้มีในระบบ"), "forgot password generic message");
await new Promise((r) => setTimeout(r, 1500));
const res = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${users.sup.email}" subject:"ตั้งรหัสผ่านใหม่"`)}`).then((r) => r.json());
const msg = await fetch(`${MAIL}/api/v1/message/${res.messages[0].ID}`).then((r) => r.json());
const link = (msg.Text || msg.HTML).match(/https?:\/\/[^\s"<>)]+(?:verify|auth\/confirm)[^\s"<>)]+/)[0].replace(/&amp;/g, "&");
await gotoReady(fp, link); await fp.waitForLoadState("networkidle"); await fp.waitForTimeout(1500);
assert(fp.url().includes("/auth/reset-password"), "recovery link -> reset page");
await fp.fill("#password", "NewPassw0rd9"); await fp.fill("#confirm_password", "NewPassw0rd9");
await fp.click("main button[type=submit]"); await fp.waitForURL(/dashboard/);
assert((await fp.content()).includes("เปลี่ยนรหัสผ่านเรียบร้อย"), "password reset works");

// invalid confirm link -> clean /login + error dialog
const bad = (await newUser()).page;
await gotoReady(bad, `${BASE}/auth/confirm?token_hash=bogus&type=email`);
await waitFlash(bad, "login");
assert(bad.url() === `${BASE}/login` && (await bad.getByRole("dialog").innerText()).includes("เกิดข้อผิดพลาด"), "bad confirm link -> clean URL + error dialog");
await shot(bad, "10-error-flash");
await bad.getByRole("button", { name: "ตกลง" }).click();
await bad.reload();
await bad.waitForTimeout(800);
assert((await bad.getByRole("dialog").count()) === 0, "flash shows only once (gone after reload)");
// ---------- 9. profile: edit name + avatar (Supabase Storage) ----------
await gotoReady(other, `${BASE}/profile`);
await other.fill("#last_name", "ทดสอบใหม่");
await other.getByRole("button", { name: "บันทึก", exact: true }).click();
await waitFlash(other, "profile");
assert(sql("select last_name from profiles where email='other@test.local'") === "ทดสอบใหม่" && (await other.locator("body").innerText()).includes("คนอื่น ทดสอบใหม่"), "profile name updated (sidebar too)");
await closeFlash(other);
const otherId = sql("select id from profiles where email='other@test.local'");
for (const [i, color] of [[1, [220, 38, 38]], [2, [37, 99, 235]]]) {
  await other.locator("[data-testid=avatar-input]").setInputFiles({ name: `me${i}.png`, mimeType: "image/png", buffer: makePng(900, 600, color) });
  await other.getByRole("button", { name: "บันทึกรูป" }).click();
  await waitFlash(other, "profile");
  await closeFlash(other);
}
const avatarPath = sql("select avatar_path from profiles where email='other@test.local'");
assert(new RegExp(`^${otherId}/[0-9a-f-]{36}\\.webp$`).test(avatarPath), `avatar saved as resized webp in own folder (${avatarPath})`);
assert(sql(`select count(*) from storage.objects where bucket_id='avatars' and name like '${otherId}/%'`) === "1", "old avatar file deleted after change (1 file left)");
const imgSrc = await other.locator("img[alt^='รูปโปรไฟล์']").first().getAttribute("src");
const imgRes = await fetch(imgSrc);
assert(imgSrc.includes(avatarPath) && imgRes.ok && imgRes.headers.get("content-type") === "image/webp", "avatar image served from public bucket");
await shot(other, "18-profile");
// อัปโหลดเข้าโฟลเดอร์คนอื่นไม่ได้ (Storage policy) / ตั้ง path ของคนอื่นไม่ได้ (ฟังก์ชันในฐานข้อมูล)
const asOther = (q) => { try { sql(`begin; set local role authenticated; set local request.jwt.claims = '{"sub":"${otherId}","role":"authenticated"}'; ${q}; commit;`); return "ok"; } catch (e) { return String(e.stderr || e.message); } };
assert(asOther(`insert into storage.objects (bucket_id, name) values ('avatars', '${empId}/hack.webp')`).includes("row-level security"), "cannot upload into another user's avatar folder");
assert(asOther(`select public.set_my_avatar('${empId}/hack.webp')`).includes("ไฟล์รูปไม่ถูกต้อง"), "cannot point own avatar at another user's file");
await other.getByRole("button", { name: "ลบรูป" }).click();
await other.getByRole("alertdialog").getByRole("button", { name: "ยืนยันการลบ" }).click();
await waitFlash(other, "profile");
assert(sql("select coalesce(avatar_path,'null') from profiles where email='other@test.local'") === "null" && sql(`select count(*) from storage.objects where bucket_id='avatars' and name like '${otherId}/%'`) === "0", "avatar removed (profile + file)");

// mobile screenshot
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
// login ด้วยรหัสพนักงาน: ไม่มีรหัสนี้ / รหัสผ่านผิด -> ข้อความเดียวกัน, ถูกต้อง (พิมพ์เล็ก) -> เข้าได้
const cp = await (await browser.newContext()).newPage();
for (const [code, pw] of [["NOPE999", "Passw0rd123"], ["emp01", "WrongPass1"]]) {
  await gotoReady(cp, `${BASE}/login`); await cp.fill("#identifier", code); await cp.fill("#password", pw);
  await cp.click("main button[type=submit]");
  await cp.getByText("อีเมล/รหัสพนักงาน หรือรหัสผ่านไม่ถูกต้อง").first().waitFor();
  assert((await cp.inputValue("#identifier")) === code, `login ${code} wrong -> generic error, keeps value`);
}
await cp.fill("#identifier", "oth01"); await cp.fill("#password", "Passw0rd123"); await cp.click("main button[type=submit]"); await cp.waitForURL(/dashboard/);
await cp.getByText("OTH01").first().waitFor({ timeout: 15000 });
assert(cp.url().endsWith("/dashboard"), "login with employee code (lowercase oth01) -> dashboard as OTH01");
await shot(cp, "17-login-employee-code");
await gotoReady(mp, `${BASE}/login`); await mp.fill("#identifier", users.admin.code); await mp.fill("#password", "Passw0rd123");
await mp.click("main button[type=submit]"); await mp.waitForURL(/dashboard/);
await gotoReady(mp, `${BASE}/approvals`);
await shot(mp, "09-mobile-approvals");

failOnPageErrors();
console.log("\nALL E2E CHECKS PASSED");
await browser.close();
