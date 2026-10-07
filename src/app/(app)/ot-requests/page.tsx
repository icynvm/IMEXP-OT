import type { Metadata } from "next";
import Link from "next/link";
import { cancelOtRequest } from "@/actions/ot-requests";
import { Flash } from "@/components/flash";
import { OtRequestTable } from "@/components/ot-tables";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { getMyOtRequests } from "@/lib/data";

export const metadata: Metadata = { title: "คำขอทำ OT" };

export default async function OtRequestsPage({ searchParams }: PageProps<"/ot-requests">) {
  const { message } = await searchParams;
  const user = await requireUser();
  const requests = await getMyOtRequests(user.id);

  return (
    <>
      <Flash message={message} />
      <PageHeader
        title="คำขอทำ OT ของฉัน"
        description="เมื่อหัวหน้าอนุมัติ ชั่วโมงจะถูกเพิ่มเข้ายอดสะสม เพื่อนำไปใช้ภายหลัง"
        action={
          <Link href="/ot-requests/new" className={buttonClass()}>
            + ขอทำ OT
          </Link>
        }
      />
      <Card>
        <OtRequestTable rows={requests} onCancel={cancelOtRequest} />
      </Card>
    </>
  );
}
