import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { todayTH } from "@/lib/format";
import { OtRequestForm } from "./ot-request-form";

export const metadata: Metadata = { title: "ขอทำ OT" };

export default async function NewOtRequestPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="ขอทำ OT" description="กรอกข้อมูลแล้วกดส่ง ระบบจะแจ้งหัวหน้าทางอีเมลเพื่อพิจารณา" />
      <Card className="max-w-2xl">
        <OtRequestForm today={todayTH()} />
      </Card>
    </>
  );
}
