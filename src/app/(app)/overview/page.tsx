import { CalendarCheck, Download, Filter, Hourglass, RotateCcw, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MonthSelect } from "@/components/month-select";
import { OtRequestTable, OtUsageTable } from "@/components/ot-tables";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { APPROVER_ROLES, ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { getDepartments, getHistory, getManagedSummaries } from "@/lib/data";
import { parseOverviewFilters } from "@/lib/filters";
import { formatHours, formatMonth, fullName, todayTH } from "@/lib/format";

export const metadata: Metadata = { title: "ภาพรวม" };

const sum = (rows: { hours: number }[]) => rows.reduce((s, r) => s + Number(r.hours), 0);

function CsvButton({ href }: { href: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href}>
        <Download />
        CSV
      </a>
    </Button>
  );
}

export default async function OverviewPage({ searchParams }: PageProps<"/overview">) {
  const user = await requireUser(APPROVER_ROLES);
  const filters = parseOverviewFilters(await searchParams);

  const [summaries, history, departments] = await Promise.all([
    getManagedSummaries(user),
    getHistory(user, { from: filters.from, to: filters.to, employeeId: filters.employeeId }),
    getDepartments(),
  ]);
  // ชื่อแผนก / ชื่อหัวหน้าทีม สำหรับแสดงในตารางยอดสะสม
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const personName = new Map(summaries.map((s) => [s.employee_id, fullName(s)]));
  personName.set(user.id, "คุณ");

  // ตัวเลขสรุปของเดือนที่เลือก
  const approvedRequests = history.requests.filter((r) => r.status === "approved");
  const approvedUsages = history.usages.filter((u) => u.status === "approved");
  const pendingRequests = history.requests.filter((r) => r.status === "pending");
  const pendingUsages = history.usages.filter((u) => u.status === "pending");

  // ตารางรายการ: กรองตามสถานะที่เลือก
  const requests = filters.status ? history.requests.filter((r) => r.status === filters.status) : history.requests;
  const usages = filters.status ? history.usages.filter((u) => u.status === filters.status) : history.usages;

  const exportQuery = new URLSearchParams({
    month: filters.month,
    ...(filters.status && { status: filters.status }),
    ...(filters.employeeId && { employee: filters.employeeId }),
  });

  return (
    <>
      <PageHeader
        title={user.role === "admin" ? "ภาพรวมทั้งหมด" : user.role === "department_head" ? "ภาพรวมแผนก" : "ภาพรวมทีม"}
        description={`ข้อมูลประจำเดือน ${formatMonth(filters.month)}`}
      />

      {/* ตัวกรอง (ส่งผ่าน URL จึงกด back / แชร์ลิงก์ได้) */}
      <Card className="mb-6">
        <CardContent>
          <form className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="month">เดือน</Label>
              <MonthSelect id="month" name="month" defaultValue={filters.month} current={todayTH().slice(0, 7)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">สถานะ</Label>
              <Select name="status" defaultValue={filters.status ?? "all"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee">พนักงาน</Label>
              <Select name="employee" defaultValue={filters.employeeId ?? "all"}>
                <SelectTrigger id="employee" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกคน</SelectItem>
                  {summaries.map((s) => (
                    <SelectItem key={s.employee_id} value={s.employee_id}>
                      {s.employee_code} · {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                <Filter />
                แสดงผล
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href="/overview" aria-label="ล้างตัวกรอง" title="ล้างตัวกรอง">
                  <RotateCcw />
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="OT ที่อนุมัติ (เดือนนี้)" value={formatHours(sum(approvedRequests))} icon={TrendingUp} tone="blue" hint={`${approvedRequests.length} รายการ`} />
        <StatCard label="ใช้ OT ที่อนุมัติ (เดือนนี้)" value={formatHours(sum(approvedUsages))} icon={CalendarCheck} hint={`${approvedUsages.length} รายการ`} />
        <StatCard label="คำขอ OT รออนุมัติ" value={`${pendingRequests.length} รายการ`} icon={Hourglass} tone="amber" hint={formatHours(sum(pendingRequests))} />
        <StatCard label="คำขอใช้ OT รออนุมัติ" value={`${pendingUsages.length} รายการ`} icon={Hourglass} tone="amber" hint={formatHours(sum(pendingUsages))} />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ยอดชั่วโมงสะสมรายบุคคล</CardTitle>
            <CardDescription>ตั้งแต่เริ่มใช้ระบบ · กดชื่อเพื่อดูรายการของคนนั้น</CardDescription>
            <CardAction>
              <CsvButton href="/overview/export?type=balances" />
            </CardAction>
          </CardHeader>
          <CardContent>
            {summaries.length === 0 ? (
              <EmptyState icon={Users}>ยังไม่มีพนักงานในความดูแล (ให้ admin กำหนดหัวหน้าในหน้าจัดการผู้ใช้)</EmptyState>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>แผนก / หัวหน้าทีม</TableHead>
                    <TableHead className="text-right">ได้รับอนุมัติ</TableHead>
                    <TableHead className="text-right">ใช้แล้ว</TableHead>
                    <TableHead className="text-right">จองไว้</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((s) => (
                    <TableRow key={s.employee_id} className={s.is_active ? "" : "opacity-50"}>
                      <TableCell>
                        <Link
                          href={`/overview?${new URLSearchParams({ month: filters.month, employee: s.employee_id })}`}
                          className="font-medium hover:underline"
                        >
                          {s.first_name} {s.last_name}
                        </Link>
                        <div className="text-muted-foreground text-xs">
                          {s.employee_code}
                          {!s.is_active && " · ปิดใช้งาน"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[s.role]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{(s.department_id && deptName.get(s.department_id)) || "-"}</div>
                        <div className="text-muted-foreground">
                          {s.supervisor_id ? `หัวหน้า: ${personName.get(s.supervisor_id) ?? "-"}` : "ไม่มีหัวหน้า"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(s.earned_hours)}</TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">{formatHours(s.used_hours)}</TableCell>
                      <TableCell className="text-right text-amber-600 tabular-nums">{formatHours(s.reserved_hours)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 tabular-nums">
                        {formatHours(s.remaining_hours)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              คำขอทำ OT <Badge variant="secondary">{requests.length}</Badge>
            </CardTitle>
            <CardAction>
              <CsvButton href={`/overview/export?type=requests&${exportQuery}`} />
            </CardAction>
          </CardHeader>
          <CardContent>
            <OtRequestTable rows={requests} showEmployee />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              การใช้ชั่วโมง OT <Badge variant="secondary">{usages.length}</Badge>
            </CardTitle>
            <CardAction>
              <CsvButton href={`/overview/export?type=usages&${exportQuery}`} />
            </CardAction>
          </CardHeader>
          <CardContent>
            <OtUsageTable rows={usages} showEmployee />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
