import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getHolidays, holidayMap } from "@/lib/data";
import { todayTH } from "@/lib/format";
import { OtRequestForm } from "./ot-request-form";

export const metadata: Metadata = { title: "ขอทำ OT" };

export default async function NewOtRequestPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="ขอทำ OT" description="กรอกข้อมูลแล้วกดส่ง ระบบจะแจ้งหัวหน้าทางอีเมลเพื่อพิจารณา" />
      <Card>
        <CardContent>
          <OtRequestForm today={todayTH()} holidays={holidayMap(await getHolidays())} />
        </CardContent>
      </Card>
    </div>
  );
}
