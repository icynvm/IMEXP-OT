import type { Metadata } from "next";
import Link from "next/link";
import { cancelOtUsage } from "@/actions/ot-usages";
import { Flash } from "@/components/flash";
import { OtUsageTable } from "@/components/ot-tables";
import { buttonClass } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { getMyOtUsages, getMySummary } from "@/lib/data";
import { formatHours } from "@/lib/format";

export const metadata: Metadata = { title: "ใช้ชั่วโมง OT" };

export default async function OtUsagesPage({ searchParams }: PageProps<"/ot-usages">) {
  const { message } = await searchParams;
  const user = await requireUser();
  const [usages, summary] = await Promise.all([getMyOtUsages(user.id), getMySummary(user.id)]);

  return (
    <>
      <Flash message={message} />
      <PageHeader
        title="การใช้ชั่วโมง OT ของฉัน"
        description="ชั่วโมงที่ขอใช้จะถูกจองไว้ทันที และตัดจริงเมื่อหัวหน้าอนุมัติ"
        action={
          <Link href="/ot-usages/new" className={buttonClass()}>
            + ขอใช้ชั่วโมง OT
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard label="คงเหลือ (ใช้ได้)" value={formatHours(summary?.remaining_hours)} tone="green" />
        <StatCard label="จองไว้ (รออนุมัติ)" value={formatHours(summary?.reserved_hours)} tone="amber" />
      </div>
      <Card>
        <OtUsageTable rows={usages} onCancel={cancelOtUsage} />
      </Card>
    </>
  );
}
