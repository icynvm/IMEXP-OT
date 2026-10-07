import { Hourglass, Plus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cancelOtUsage } from "@/actions/ot-usages";
import { OtUsageTable } from "@/components/ot-tables";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getMyOtUsages, getMySummary } from "@/lib/data";
import { formatHours } from "@/lib/format";

export const metadata: Metadata = { title: "ใช้ชั่วโมง OT" };

export default async function OtUsagesPage() {
  const user = await requireUser();
  const [usages, summary] = await Promise.all([getMyOtUsages(user.id), getMySummary(user.id)]);

  return (
    <>
      <PageHeader
        title="ใช้ชั่วโมง OT"
        description="ชั่วโมงที่ขอใช้จะถูกจองไว้ทันที และตัดจริงเมื่อหัวหน้าอนุมัติ"
        action={
          <Button asChild>
            <Link href="/ot-usages/new">
              <Plus />
              ขอใช้ชั่วโมง
            </Link>
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <StatCard label="คงเหลือ (ใช้ได้)" value={formatHours(summary?.remaining_hours)} icon={Wallet} tone="green" />
        <StatCard label="จองไว้ (รออนุมัติ)" value={formatHours(summary?.reserved_hours)} icon={Hourglass} tone="amber" />
      </div>
      <Card>
        <CardContent>
          <OtUsageTable rows={usages} onCancel={cancelOtUsage} />
        </CardContent>
      </Card>
    </>
  );
}
