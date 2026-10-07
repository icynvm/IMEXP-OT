/**
 * ฟังก์ชันจัดรูปแบบวันที่ / เวลา / ชั่วโมง ให้เป็นภาษาไทย
 * ทุกอย่างอิงเวลาประเทศไทย (Asia/Bangkok)
 */
const TZ = "Asia/Bangkok";

/** วันนี้ในรูปแบบ YYYY-MM-DD (เวลาไทย) */
export function todayTH(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** "2026-10-07" -> "7 ต.ค. 2569" */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00+07:00`));
}

/** timestamp -> "7 ต.ค. 2569 14:30" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** "18:00:00" -> "18:00" */
export function formatTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "-";
}

/** 3.5 -> "3.5 ชม." */
export function formatHours(hours: number | string | null | undefined): string {
  const n = Number(hours ?? 0);
  return `${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ชม.`;
}

export function fullName(p: { first_name: string; last_name: string } | null | undefined): string {
  return p ? `${p.first_name} ${p.last_name}` : "-";
}

/** จำนวนชั่วโมงระหว่างเวลา "HH:MM" สองค่า */
export function hoursBetween(start: string, end: string): number {
  const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return (toMinutes(end) - toMinutes(start)) / 60;
}

/** "2026-10" -> { from: "2026-10-01", to: "2026-10-31" } */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** "2026-10" -> "ตุลาคม 2569" */
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("th-TH", { timeZone: TZ, month: "long", year: "numeric" }).format(
    new Date(`${month}-15T12:00:00+07:00`),
  );
}
