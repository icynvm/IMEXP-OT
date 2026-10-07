import { CalendarClock, ClipboardCheck, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { PERIOD_LABELS } from "@/lib/constants";
import { getPendingApprovals } from "@/lib/data";
import { formatDate, formatDateTime, formatHours, formatTime, fullName } from "@/lib/format";
import type { PersonRef } from "@/lib/types";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "รออนุมัติ" };

function Person({ person }: { person?: PersonRef | null }) {
  const name = fullName(person);
  return (
    <div className="flex items-center gap-3">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
        {name.slice(0, 1)}
      </div>
      <div className="leading-tight">
        <p className="font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">{person?.employee_code}</p>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
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
        description={user.role === "admin" ? "คำขอของพนักงานทุกคน (ยกเว้นของคุณเอง)" : "คำขอของลูกทีมที่คุณดูแล"}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="text-muted-foreground size-4" />
              คำขอทำ OT
              <Badge variant="secondary">{requests.length}</Badge>
            </CardTitle>
            <CardDescription>อนุมัติแล้ว ชั่วโมงจะเข้ายอดสะสมของพนักงาน</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <EmptyState icon={ClipboardCheck}>ไม่มีคำขอทำ OT รออนุมัติ</EmptyState>
            ) : (
              <ul className="divide-y">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between">
                    <div className="grid gap-3">
                      <Person person={r.employee} />
                      <dl className="grid gap-1.5">
                        <Detail label="วันที่ทำงาน">{formatDate(r.work_date)}</Detail>
                        <Detail label="ช่วงเวลา">
                          {PERIOD_LABELS[r.period]} · {formatTime(r.start_time)}–{formatTime(r.end_time)}
                        </Detail>
                        <Detail label="จำนวน">
                          <span className="text-primary font-semibold">{formatHours(r.hours)}</span>
                        </Detail>
                        <Detail label="งาน">
                          <span className="whitespace-pre-line">{r.description}</span>
                        </Detail>
                        <Detail label="ยื่นเมื่อ">
                          <span className="text-muted-foreground">{formatDateTime(r.created_at)}</span>
                        </Detail>
                      </dl>
                    </div>
                    <ReviewForm
                      kind="request"
                      id={r.id}
                      summary={`${fullName(r.employee)} · OT วันที่ ${formatDate(r.work_date)} · ${formatHours(r.hours)}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="text-muted-foreground size-4" />
              คำขอใช้ชั่วโมง OT
              <Badge variant="secondary">{usages.length}</Badge>
            </CardTitle>
            <CardDescription>อนุมัติแล้ว ระบบจะตัดชั่วโมงจากยอดสะสมตามที่พนักงานเลือก</CardDescription>
          </CardHeader>
          <CardContent>
            {usages.length === 0 ? (
              <EmptyState icon={ClipboardCheck}>ไม่มีคำขอใช้ OT รออนุมัติ</EmptyState>
            ) : (
              <ul className="divide-y">
                {usages.map((u) => (
                  <li key={u.id} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between">
                    <div className="grid gap-3">
                      <Person person={u.employee} />
                      <dl className="grid gap-1.5">
                        <Detail label="วันที่ต้องการใช้">{formatDate(u.use_date)}</Detail>
                        <Detail label="จำนวน">
                          <span className="text-primary font-semibold">{formatHours(u.hours)}</span>
                        </Detail>
                        <Detail label="ตัดจาก OT">
                          <ul className="grid gap-0.5">
                            {u.allocations?.map((a) => (
                              <li key={a.ot_request_id}>
                                {formatDate(a.ot_request?.work_date)}{" "}
                                <span className="text-muted-foreground">
                                  ({a.ot_request?.description}) · {formatHours(a.hours)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Detail>
                        <Detail label="เหตุผล">{u.reason ?? "-"}</Detail>
                        <Detail label="ยื่นเมื่อ">
                          <span className="text-muted-foreground">{formatDateTime(u.created_at)}</span>
                        </Detail>
                      </dl>
                    </div>
                    <ReviewForm
                      kind="usage"
                      id={u.id}
                      summary={`${fullName(u.employee)} · ใช้วันที่ ${formatDate(u.use_date)} · ${formatHours(u.hours)}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
