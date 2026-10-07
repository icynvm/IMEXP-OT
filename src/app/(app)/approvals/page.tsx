import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { PERIOD_LABELS } from "@/lib/constants";
import { getPendingApprovals } from "@/lib/data";
import { formatDate, formatDateTime, formatHours, formatTime, fullName } from "@/lib/format";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "รออนุมัติ" };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  );
}

export default async function ApprovalsPage() {
  const user = await requireUser(["admin", "supervisor"]);
  const { requests, usages } = await getPendingApprovals(user.id);

  return (
    <>
      <PageHeader
        title="รายการรออนุมัติ"
        description={
          user.role === "admin"
            ? "คำขอของพนักงานทุกคน (ยกเว้นของคุณเอง)"
            : "คำขอของลูกทีมที่คุณดูแล"
        }
      />

      <div className="space-y-6">
        <Card title={`คำขอทำ OT (${requests.length})`}>
          {requests.length === 0 ? (
            <EmptyState>ไม่มีคำขอทำ OT รออนุมัติ</EmptyState>
          ) : (
            <ul className="divide-y divide-gray-100">
              {requests.map((r) => (
                <li key={r.id} className="grid gap-4 py-4 md:grid-cols-[1fr_280px]">
                  <dl className="space-y-1">
                    <Detail label="พนักงาน">
                      <span className="font-medium">{fullName(r.employee)}</span>{" "}
                      <span className="text-gray-500">({r.employee?.employee_code})</span>
                    </Detail>
                    <Detail label="วันที่ทำงาน">{formatDate(r.work_date)}</Detail>
                    <Detail label="ช่วงเวลา">
                      {PERIOD_LABELS[r.period]} · {formatTime(r.start_time)}-{formatTime(r.end_time)}
                    </Detail>
                    <Detail label="จำนวน">
                      <span className="font-semibold text-blue-700">{formatHours(r.hours)}</span>
                    </Detail>
                    <Detail label="งาน">
                      <span className="whitespace-pre-line">{r.description}</span>
                    </Detail>
                    <Detail label="วันที่ขอ">
                      {formatDate(r.request_date)}{" "}
                      <span className="text-xs text-gray-400">(ส่งเมื่อ {formatDateTime(r.created_at)})</span>
                    </Detail>
                  </dl>
                  <ReviewForm kind="request" id={r.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`คำขอใช้ชั่วโมง OT (${usages.length})`}>
          {usages.length === 0 ? (
            <EmptyState>ไม่มีคำขอใช้ OT รออนุมัติ</EmptyState>
          ) : (
            <ul className="divide-y divide-gray-100">
              {usages.map((u) => (
                <li key={u.id} className="grid gap-4 py-4 md:grid-cols-[1fr_280px]">
                  <dl className="space-y-1">
                    <Detail label="พนักงาน">
                      <span className="font-medium">{fullName(u.employee)}</span>{" "}
                      <span className="text-gray-500">({u.employee?.employee_code})</span>
                    </Detail>
                    <Detail label="วันที่ต้องการใช้">{formatDate(u.use_date)}</Detail>
                    <Detail label="จำนวน">
                      <span className="font-semibold text-blue-700">{formatHours(u.hours)}</span>
                    </Detail>
                    <Detail label="ตัดจาก OT">
                      <ul>
                        {u.allocations?.map((a) => (
                          <li key={a.ot_request_id}>
                            {formatDate(a.ot_request?.work_date)} ({a.ot_request?.description}) ·{" "}
                            {formatHours(a.hours)}
                          </li>
                        ))}
                      </ul>
                    </Detail>
                    <Detail label="เหตุผล">{u.reason ?? "-"}</Detail>
                    <Detail label="วันที่ยื่น">{formatDateTime(u.created_at)}</Detail>
                  </dl>
                  <ReviewForm kind="usage" id={u.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
