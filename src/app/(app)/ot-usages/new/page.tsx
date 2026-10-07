import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getMyAvailableBalances } from "@/lib/data";
import { todayTH } from "@/lib/format";
import { OtUsageForm } from "./ot-usage-form";

export const metadata: Metadata = { title: "ขอใช้ชั่วโมง OT" };

export default async function NewOtUsagePage() {
  const user = await requireUser();
  const today = todayTH();
  // ใช้ได้เฉพาะ OT ที่อนุมัติแล้ว และทำไปแล้ว (วันที่ทำ OT ไม่เกินวันนี้)
  const balances = (await getMyAvailableBalances(user.id)).filter((b) => b.work_date <= today);

  return (
    <>
      <PageHeader
        title="ขอใช้ชั่วโมง OT"
        description="เลือกว่าจะใช้ชั่วโมงจาก OT วันไหน ชั่วโมงที่เหลือจะเก็บไว้ใช้ครั้งต่อไปได้"
      />
      <Card className="max-w-4xl">
        {balances.length === 0 ? (
          <div className="text-center">
            <EmptyState>คุณยังไม่มีชั่วโมง OT ที่ใช้ได้ (ต้องเป็น OT ที่อนุมัติแล้วและทำไปแล้ว)</EmptyState>
            <Link href="/ot-requests/new" className={buttonClass()}>
              ขอทำ OT
            </Link>
          </div>
        ) : (
          <OtUsageForm balances={balances} today={today} />
        )}
      </Card>
    </>
  );
}
