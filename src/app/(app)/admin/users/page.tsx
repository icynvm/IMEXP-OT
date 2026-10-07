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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getAllProfiles } from "@/lib/data";
import { fullName } from "@/lib/format";

export const metadata: Metadata = { title: "จัดการผู้ใช้" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireUser(["admin"]);
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.trim().toLowerCase() : "";

  const profiles = await getAllProfiles();
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const rows = search
    ? profiles.filter((p) =>
        [p.employee_code, p.first_name, p.last_name, p.email].some((v) => v.toLowerCase().includes(search)),
      )
    : profiles;
  const noSupervisor = profiles.filter((p) => p.is_active && p.role !== "admin" && !p.supervisor_id).length;

  return (
    <>
      <PageHeader
        title="จัดการผู้ใช้"
        description="กำหนดบทบาท หัวหน้าผู้อนุมัติ และเปิด/ปิดการใช้งานบัญชี (ผู้ใช้ใหม่สมัครเองที่หน้าสมัครสมาชิก)"
      />
      {noSupervisor > 0 && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
          <TriangleAlert />
          <AlertDescription className="text-amber-800">
            มีผู้ใช้ {noSupervisor} คนที่ยังไม่ได้กำหนดหัวหน้า (คำขอของคนกลุ่มนี้จะส่งให้ admin พิจารณา)
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="grid gap-4">
          <form className="relative max-w-sm">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={search} placeholder="ค้นหา รหัส / ชื่อ / อีเมล" aria-label="ค้นหา" className="pl-9" />
          </form>
          {rows.length === 0 ? (
            <EmptyState icon={Users}>ไม่พบผู้ใช้</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ใช้</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>หัวหน้า</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className={p.is_active ? "" : "opacity-50"}>
                    <TableCell>
                      <div className="font-medium">{fullName(p)}</div>
                      <div className="text-muted-foreground text-xs">
                        {p.employee_code} · {p.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.role === "employee" ? "outline" : "secondary"}>{ROLE_LABELS[p.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.supervisor_id ? fullName(byId.get(p.supervisor_id)) : <span className="text-amber-600">ยังไม่กำหนด</span>}
                    </TableCell>
                    <TableCell>
                      {p.is_active ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
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
                          แก้ไข
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
