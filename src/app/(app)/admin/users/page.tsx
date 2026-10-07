import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/flash";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Table, Td, Th } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getAllProfiles } from "@/lib/data";
import { fullName } from "@/lib/format";

export const metadata: Metadata = { title: "จัดการผู้ใช้" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireUser(["admin"]);
  const { message, q } = await searchParams;
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
      <Flash message={message} />
      <PageHeader
        title="จัดการผู้ใช้"
        description="กำหนดบทบาท, หัวหน้าผู้อนุมัติ และเปิด/ปิดการใช้งานบัญชี (ผู้ใช้ใหม่สมัครเองที่หน้าสมัครสมาชิก)"
      />
      {noSupervisor > 0 && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          มีผู้ใช้ {noSupervisor} คนที่ยังไม่ได้กำหนดหัวหน้า (คำขอของคนกลุ่มนี้จะส่งให้ admin พิจารณา)
        </p>
      )}
      <Card>
        <form className="mb-4 flex max-w-md gap-2">
          <Input name="q" defaultValue={search} placeholder="ค้นหา รหัส / ชื่อ / อีเมล" aria-label="ค้นหา" />
          <button type="submit" className={buttonClass("secondary")}>
            ค้นหา
          </button>
        </form>
        {rows.length === 0 ? (
          <EmptyState>ไม่พบผู้ใช้</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>รหัสพนักงาน</Th>
                <Th>ชื่อ-นามสกุล</Th>
                <Th>อีเมล</Th>
                <Th>บทบาท</Th>
                <Th>หัวหน้า</Th>
                <Th>สถานะ</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <tr key={p.id} className={p.is_active ? "" : "text-gray-400"}>
                  <Td className="whitespace-nowrap">{p.employee_code}</Td>
                  <Td className="whitespace-nowrap">{fullName(p)}</Td>
                  <Td>{p.email}</Td>
                  <Td className="whitespace-nowrap">{ROLE_LABELS[p.role]}</Td>
                  <Td className="whitespace-nowrap">
                    {p.supervisor_id ? fullName(byId.get(p.supervisor_id)) : <span className="text-amber-700">-</span>}
                  </Td>
                  <Td className="whitespace-nowrap">{p.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</Td>
                  <Td>
                    <Link href={`/admin/users/${p.id}`} className={buttonClass("secondary", "sm")}>
                      แก้ไข
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
