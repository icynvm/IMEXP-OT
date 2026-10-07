import { Plus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getHolidays, getMyAvailableBalances, holidayMap } from "@/lib/data";
import { todayTH } from "@/lib/format";
import { OtUsageForm } from "./ot-usage-form";

export const metadata: Metadata = { title: "ขอใช้ชั่วโมง OT" };

export default async function NewOtUsagePage() {
  const user = await requireUser();
  const today = todayTH();
  // ใช้ได้เฉพาะ OT ที่อนุมัติแล้ว และทำไปแล้ว (วันที่ทำ OT ไม่เกินวันนี้)
  const balances = (await getMyAvailableBalances(user.id)).filter((b) => b.work_date <= today);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="ขอใช้ชั่วโมง OT"
        description="เลือกว่าจะใช้ชั่วโมงจาก OT วันไหน ชั่วโมงที่เหลือจะเก็บไว้ใช้ครั้งต่อไปได้"
      />
      <Card>
        <CardContent>
          {balances.length === 0 ? (
            <EmptyState
              icon={Wallet}
              action={
                <Button asChild>
                  <Link href="/ot-requests/new">
                    <Plus />
                    ขอทำ OT
                  </Link>
                </Button>
              }
            >
              ยังไม่มีชั่วโมง OT ที่ใช้ได้ (ต้องเป็น OT ที่อนุมัติแล้วและทำไปแล้ว)
            </EmptyState>
          ) : (
            <OtUsageForm balances={balances} today={today} holidays={holidayMap(await getHolidays())} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
