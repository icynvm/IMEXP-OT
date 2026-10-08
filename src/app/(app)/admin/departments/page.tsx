import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteDepartment } from "@/actions/admin";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getAllProfiles, getDepartments } from "@/lib/data";
import { fullName } from "@/lib/format";
import { DepartmentDialog } from "./department-dialog";

export const metadata: Metadata = { title: "แผนก" };

export default async function DepartmentsPage() {
  await requireUser(["admin"]);
  const [departments, profiles] = await Promise.all([
    getDepartments(),
    getAllProfiles(),
  ]);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  // ตัวเลือกหัวหน้าแผนก: ผู้ใช้บทบาทหัวหน้าแผนกที่ยังใช้งานอยู่
  const headCandidates = profiles.filter(
    (p) => p.role === "department_head" && p.is_active,
  );
  const optionsFor = (deptId?: string) =>
    headCandidates
      // คนที่เป็นหัวหน้าแผนกอื่นอยู่แล้ว เลือกซ้ำไม่ได้
      .filter(
        (p) => !departments.some((d) => d.head_id === p.id && d.id !== deptId),
      )
      .map((p) => ({ id: p.id, label: `${p.employee_code} · ${fullName(p)}` }));

  return (
    <>
      <PageHeader
        title="แผนก"
        description="แต่ละแผนกมีหัวหน้าแผนก 1 คน กำหนดสมาชิกของแผนกได้ที่หน้าจัดการผู้ใช้"
        action={
          <DepartmentDialog
            headOptions={optionsFor()}
            trigger={
              <Button>
                <Plus />
                สร้างแผนก
              </Button>
            }
          />
        }
      />
      <Card>
        <CardContent>
          {departments.length === 0 ? (
            <EmptyState icon={Building2}>
              ยังไม่มีแผนก กด &quot;สร้างแผนก&quot; เพื่อเริ่มต้น
            </EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>แผนก</TableHead>
                  {/* จอมือถือ: ซ่อนคอลัมน์รอง แสดงใต้ชื่อแผนกแทน */}
                  <TableHead className="hidden md:table-cell">
                    หัวหน้าแผนก
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    หัวหน้าทีม
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    สมาชิกทั้งหมด
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => {
                  const members = profiles.filter(
                    (p) => p.department_id === d.id && p.is_active,
                  );
                  const head = d.head_id ? byId.get(d.head_id) : undefined;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium whitespace-normal">
                        <Link
                          href={`/admin/users?dept=${d.id}`}
                          className="hover:underline"
                        >
                          {d.name}
                        </Link>
                        <div className="text-muted-foreground text-xs font-normal md:hidden">
                          หัวหน้า:{" "}
                          {head ? (
                            fullName(head)
                          ) : (
                            <span className="text-amber-600">ยังไม่กำหนด</span>
                          )}{" "}
                          · สมาชิก {members.length} คน
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {head ? (
                          fullName(head)
                        ) : (
                          <span className="text-amber-600">ยังไม่กำหนด</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {members.filter((p) => p.role === "supervisor").length}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {members.length}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <DepartmentDialog
                            department={d}
                            headOptions={optionsFor(d.id)}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Pencil />
                                <span className="sr-only sm:not-sr-only">
                                  แก้ไข
                                </span>
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 />
                                <span className="sr-only sm:not-sr-only">
                                  ลบ
                                </span>
                              </Button>
                            }
                            title={`ลบแผนก "${d.name}"?`}
                            description="สมาชิกในแผนกจะกลายเป็น 'ไม่มีแผนก' ข้อมูล OT ทั้งหมดยังอยู่ครบ"
                            confirmLabel="ยืนยันการลบ"
                            destructive
                            action={deleteDepartment}
                            fields={{ id: d.id }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
