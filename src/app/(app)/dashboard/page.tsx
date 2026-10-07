import { CalendarCheck, CalendarClock, Hourglass, Plus, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BalanceTable, OtRequestTable } from "@/components/ot-tables";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isApprover, requireUser } from "@/lib/auth";
import { getMyAvailableBalances, getMyOtRequests, getMySummary, getProfileById } from "@/lib/data";
import { formatHours, fullName } from "@/lib/format";

export const metadata: Metadata = { title: "หน้าหลัก" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [summary, balances, requests, supervisor] = await Promise.all([
    getMySummary(user.id),
    getMyAvailableBalances(user.id),
    getMyOtRequests(user.id),
    getProfileById(user.supervisor_id),
  ]);

  return (
    <>
      <PageHeader
        title={`สวัสดี คุณ${user.first_name}`}
        description={
          isApprover(user)
            ? "สรุปชั่วโมง OT ของคุณ · คำขอของคุณอนุมัติอัตโนมัติ"
            : supervisor
              ? `หัวหน้าผู้อนุมัติ: ${fullName(supervisor)}`
              : "สรุปชั่วโมง OT ของคุณ"
        }
        action={
          <>
            <Button variant="outline" asChild>
              <Link href="/ot-usages/new">
                <CalendarClock />
                ขอใช้ชั่วโมง
              </Link>
            </Button>
            <Button asChild>
              <Link href="/ot-requests/new">
                <Plus />
                ขอทำ OT
              </Link>
            </Button>
          </>
        }
      />

      {!isApprover(user) && !supervisor && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
          <TriangleAlert />
          <AlertDescription className="text-amber-800">
            ยังไม่ได้กำหนดหัวหน้าให้คุณ คำขอของคุณจะส่งให้หัวหน้าแผนก หรือผู้ดูแลระบบ (admin) พิจารณาแทน
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ชั่วโมงคงเหลือ" value={formatHours(summary?.remaining_hours)} icon={Wallet} tone="green" hint="ใช้ได้ทันที" />
        <StatCard label="ได้รับอนุมัติทั้งหมด" value={formatHours(summary?.earned_hours)} icon={TrendingUp} tone="blue" />
        <StatCard label="ใช้ไปแล้ว" value={formatHours(summary?.used_hours)} icon={CalendarCheck} />
        <StatCard
          label="จองไว้"
          value={formatHours(summary?.reserved_hours)}
          icon={Hourglass}
          tone="amber"
          hint="รออนุมัติการใช้ คืนยอดถ้าไม่อนุมัติ"
        />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ชั่วโมง OT ที่ยังเหลือ</CardTitle>
            <CardDescription>แยกตามวันที่ทำ OT ที่อนุมัติแล้ว</CardDescription>
          </CardHeader>
          <CardContent>
            <BalanceTable rows={balances} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>คำขอทำ OT ล่าสุด</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/ot-requests">ดูทั้งหมด</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <OtRequestTable rows={requests.slice(0, 5)} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
