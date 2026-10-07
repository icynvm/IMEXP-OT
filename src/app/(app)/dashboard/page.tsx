import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/flash";
import { BalanceTable, OtRequestTable } from "@/components/ot-tables";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { getMyAvailableBalances, getMyOtRequests, getMySummary, getProfileById } from "@/lib/data";
import { formatHours, fullName } from "@/lib/format";

export const metadata: Metadata = { title: "หน้าหลัก" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { message } = await searchParams;
  const user = await requireUser();
  const [summary, balances, requests, supervisor] = await Promise.all([
    getMySummary(user.id),
    getMyAvailableBalances(user.id),
    getMyOtRequests(user.id),
    getProfileById(user.supervisor_id),
  ]);

  return (
    <>
      <Flash message={message} />
      <PageHeader
        title={`สวัสดี คุณ${user.first_name}`}
        description="สรุปชั่วโมง OT ของคุณ"
        action={
          <div className="flex gap-2">
            <Link href="/ot-requests/new" className={buttonClass()}>
              + ขอทำ OT
            </Link>
            <Link href="/ot-usages/new" className={buttonClass("secondary")}>
              ขอใช้ชั่วโมง OT
            </Link>
          </div>
        }
      />

      {user.role !== "admin" && (
        <div className="mb-4">
          {supervisor ? (
            <p className="text-sm text-gray-600">
              หัวหน้าผู้อนุมัติของคุณ: <span className="font-medium text-gray-900">{fullName(supervisor)}</span>
            </p>
          ) : (
            <Alert tone="warning">
              ยังไม่ได้กำหนดหัวหน้าให้คุณ คำขอของคุณจะส่งให้ผู้ดูแลระบบ (admin) พิจารณาแทน
            </Alert>
          )}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ชั่วโมงคงเหลือ (ใช้ได้)" value={formatHours(summary?.remaining_hours)} tone="green" />
        <StatCard label="ได้รับอนุมัติทั้งหมด" value={formatHours(summary?.earned_hours)} tone="blue" />
        <StatCard label="ใช้ไปแล้ว" value={formatHours(summary?.used_hours)} />
        <StatCard
          label="จองไว้ (รออนุมัติการใช้)"
          value={formatHours(summary?.reserved_hours)}
          tone="amber"
          hint="จะคืนเข้ายอดคงเหลือ ถ้าไม่อนุมัติหรือยกเลิก"
        />
      </div>

      <div className="space-y-6">
        <Card title="ชั่วโมง OT ที่ยังเหลือ (แยกตามวันที่ทำ OT)">
          <BalanceTable rows={balances} />
        </Card>
        <Card
          title="คำขอทำ OT ล่าสุด"
          action={
            <Link href="/ot-requests" className="text-sm text-blue-700 hover:underline">
              ดูทั้งหมด
            </Link>
          }
        >
          <OtRequestTable rows={requests.slice(0, 5)} />
        </Card>
      </div>
    </>
  );
}
