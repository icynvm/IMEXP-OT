/**
 * ตัวช่วยที่ใช้ร่วมกันในการทดสอบ E2E (ค่าตั้งต้นตรงกับ `npx supabase start` + `npm run start`)
 * เปลี่ยนได้ด้วย Environment Variables:
 *   BASE_URL       เว็บที่ทดสอบ             (ค่าเริ่มต้น http://localhost:3000)
 *   MAILPIT_URL    กล่องอีเมลของ Supabase ในเครื่อง (http://127.0.0.1:54324)
 *   SUPABASE_URL   API ของ Supabase ในเครื่อง    (http://127.0.0.1:54321)
 *   DB_URL         ฐานข้อมูลในเครื่อง (ใช้ตรวจผลด้วย psql)
 *   CHROMIUM_PATH  ไฟล์ Chrome/Chromium (ไม่ตั้ง = ใช้ Google Chrome ที่ติดตั้งในเครื่อง)
 *   SHOTS          โฟลเดอร์เก็บภาพหน้าจอ (ไม่ตั้ง = ไม่ถ่าย)
 * ห้ามชี้ไปที่ฐานข้อมูลจริง: การทดสอบสร้าง/แก้ข้อมูลจำนวนมาก
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import zlib from "node:zlib";
import { chromium } from "playwright-core";

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
export const MAIL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
export const DB_URL = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const SHOTS = process.env.SHOTS;

if (!/127\.0\.0\.1|localhost/.test(DB_URL)) {
  throw new Error("DB_URL ต้องเป็นฐานข้อมูลในเครื่องเท่านั้น (กันลบ/แก้ข้อมูลจริง)");
}

/** รันคำสั่ง SQL ในฐานข้อมูลทดสอบ คืนผลเป็นข้อความ */
export const sql = (q) => execFileSync("psql", [DB_URL, "-Atc", q], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

export const log = (...a) => console.log("•", ...a);
export const assert = (c, m) => {
  if (!c) throw new Error("ASSERT FAILED: " + m);
  log("OK", m);
};

export const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" },
);

// ---- เก็บ error ของหน้าเว็บระหว่างทดสอบ (JavaScript error / console.error / HTTP 5xx) ----
const pageErrors = [];
// error ที่ตั้งใจให้เกิดในการทดสอบ (เช่น ลิงก์ยืนยันปลอม) ไม่นับ
const EXPECTED = [/Failed to load resource: the server responded with a status of 4\d\d/, /net::ERR_INTERNET_DISCONNECTED/];

export function watchErrors(page) {
  page.on("pageerror", (e) => pageErrors.push(`[pageerror] ${page.url()} ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !EXPECTED.some((r) => r.test(m.text()))) pageErrors.push(`[console] ${page.url()} ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 500) pageErrors.push(`[HTTP ${r.status()}] ${r.url()}`);
  });
}

export function failOnPageErrors() {
  if (pageErrors.length) {
    console.log(pageErrors.join("\n"));
    throw new Error(`พบ error ในหน้าเว็บ ${pageErrors.length} รายการ`);
  }
  log("OK", "no JavaScript / console / HTTP 5xx errors during the run");
}

/** สร้างไฟล์ PNG สีเดียว (ใช้ทดสอบอัปโหลดรูปโปรไฟล์) */
export function makePng(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** อ่านค่าจาก Environment Variable ก่อน ถ้าไม่มีอ่านจาก .env.local (ห้ามเขียน key ลงในโค้ด) */
function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    return readFileSync(".env.local", "utf8").match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/** publishable (anon) key ของ Supabase ในเครื่อง */
export const ANON_KEY = envValue("SUPABASE_ANON_KEY") ?? envValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
/** secret key ของ Supabase ในเครื่อง (ใช้สร้างผู้ใช้ทดสอบโดยตรง) */
export const SECRET_KEY = envValue("SUPABASE_SECRET_KEY");
