import { Pencil, Search, TriangleAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getAllProfiles, getDepartments } from "@/lib/data";
import { fullName } from "@/lib/format";

export const metadata: Metadata = { title: "จัดการผู้ใช้" };

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  await requireUser(["admin"]);
  const { q, dept } = await searchParams;
  const search = typeof q === "string" ? q.trim().toLowerCase() : "";
  const deptFilter = typeof dept === "string" && dept ? dept : "all"; // "all" | "none" | id แผนก

  const [profiles, departments] = await Promise.all([
    getAllProfiles(),
    getDepartments(),
  ]);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const deptName = new Map(departments.map((d) => [d.id, d.name]));

  const rows = profiles.filter((p) => {
    if (deptFilter === "none" && p.department_id) return false;
    if (
      deptFilter !== "all" &&
      deptFilter !== "none" &&
      p.department_id !== deptFilter
    )
      return false;
    if (!search) return true;
    return [p.employee_code, p.first_name, p.last_name, p.email].some((v) =>
      v.toLowerCase().includes(search),
    );
  });
  const noSupervisor = profiles.filter(
    (p) => p.is_active && p.role === "employee" && !p.supervisor_id,
  ).length;

  return (
    <>
      <PageHeader
        title="จัดการผู้ใช้"
        description="กำหนดบทบาท แผนก หัวหน้าผู้อนุมัติ และเปิด/ปิดการใช้งานบัญชี (ผู้ใช้ใหม่สมัครเองที่หน้าสมัครสมาชิก)"
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/departments">จัดการแผนก</Link>
          </Button>
        }
      />
      {noSupervisor > 0 && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
          <TriangleAlert />
          <AlertDescription className="text-amber-800">
            มีพนักงาน {noSupervisor} คนที่ยังไม่ได้กำหนดหัวหน้า
            (คำขอของคนกลุ่มนี้จะส่งให้หัวหน้าแผนก หรือ admin พิจารณา)
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="grid gap-4">
          {/* ตัวกรอง: ค้นหาชื่อ + เลือกแผนก */}
          <form className="flex flex-wrap gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                name="q"
                defaultValue={search}
                placeholder="ค้นหา รหัส / ชื่อ / อีเมล"
                aria-label="ค้นหา"
                className="pl-9"
              />
            </div>
            <Select name="dept" defaultValue={deptFilter}>
              <SelectTrigger
                className="min-w-0 flex-1 sm:w-48 sm:flex-none"
                aria-label="แผนก"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกแผนก</SelectItem>
                <SelectItem value="none">ไม่มีแผนก</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              ค้นหา
            </Button>
          </form>
          {rows.length === 0 ? (
            <EmptyState icon={Users}>ไม่พบผู้ใช้</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ใช้</TableHead>
                  {/* จอมือถือ: ซ่อนคอลัมน์รอง แล้วแสดงข้อมูลเดียวกันใต้ชื่อแทน (ตารางไม่ล้นจอ ปุ่มแก้ไขมองเห็นเสมอ) */}
                  <TableHead className="hidden md:table-cell">บทบาท</TableHead>
                  <TableHead className="hidden md:table-cell">แผนก</TableHead>
                  <TableHead className="hidden md:table-cell">
                    หัวหน้าผู้อนุมัติ
                  </TableHead>
                  <TableHead className="hidden md:table-cell">สถานะ</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow
                    key={p.id}
                    className={p.is_active ? "" : "opacity-50"}
                  >
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{fullName(p)}</div>
                      <div className="text-muted-foreground text-xs break-all">
                        {p.employee_code} · {p.email}
                      </div>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:hidden">
                        <Badge
                          variant={
                            p.role === "employee" ? "outline" : "secondary"
                          }
                        >
                          {ROLE_LABELS[p.role]}
                        </Badge>
                        <span>
                          {(p.department_id && deptName.get(p.department_id)) ||
                            "ไม่มีแผนก"}
                        </span>
                        {!p.is_active && (
                          <Badge variant="outline">ปิดใช้งาน</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant={
                          p.role === "employee" ? "outline" : "secondary"
                        }
                      >
                        {ROLE_LABELS[p.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(p.department_id && deptName.get(p.department_id)) || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.supervisor_id ? (
                        fullName(byId.get(p.supervisor_id))
                      ) : p.role === "employee" ? (
                        <span className="text-amber-600">ยังไม่กำหนด</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.is_active ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          ใช้งาน
                        </Badge>
                      ) : (
                        <Badge variant="outline">ปิดใช้งาน</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${p.id}`}>
                          <Pencil />
                          <span className="sr-only sm:not-sr-only">แก้ไข</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
