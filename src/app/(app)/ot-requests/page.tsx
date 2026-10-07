import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cancelOtRequest } from "@/actions/ot-requests";
import { OtRequestTable } from "@/components/ot-tables";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getMyOtRequests } from "@/lib/data";

export const metadata: Metadata = { title: "คำขอทำ OT" };

export default async function OtRequestsPage() {
  const user = await requireUser();
  const requests = await getMyOtRequests(user.id);

  return (
    <>
      <PageHeader
        title="คำขอทำ OT"
        description="เมื่อหัวหน้าอนุมัติ ชั่วโมงจะเข้ายอดสะสมเพื่อนำไปใช้ภายหลัง"
        action={
          <Button asChild>
            <Link href="/ot-requests/new">
              <Plus />
              ขอทำ OT
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <OtRequestTable rows={requests} onCancel={cancelOtRequest} />
        </CardContent>
      </Card>
    </>
  );
}
