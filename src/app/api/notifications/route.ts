import { NextResponse } from "next/server";
import { getCurrentProfile, isApprover } from "@/lib/auth";
import { getApprovalNotifications } from "@/lib/data";

/**
 * ข้อมูลกระดิ่งแจ้งเตือน (หน้าเว็บเรียกทุก 1 นาทีขณะเปิดอยู่)
 * เฉพาะหัวหน้าทีม / หัวหน้าแผนก / admin — ข้อมูลกรองตามสิทธิ์ด้วย RLS
 */
export async function GET() {
  const user = await getCurrentProfile();
  if (!user || !user.is_active) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isApprover(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const data = await getApprovalNotifications(user.id);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
