import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getAllProfiles } from "@/lib/data";
import { fullName } from "@/lib/format";
import { UserForm } from "./user-form";

export const metadata: Metadata = { title: "แก้ไขผู้ใช้" };

export default async function EditUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const admin = await requireUser(["admin"]);
  const { id } = await params;

  const profiles = await getAllProfiles();
  const profile = profiles.find((p) => p.id === id);
  if (!profile) notFound();

  // ตัวเลือกหัวหน้า: ต้องเป็นหัวหน้างานหรือ admin ที่ยังใช้งานอยู่ และไม่ใช่ตัวเอง
  const supervisors = profiles.filter(
    (p) => p.id !== profile.id && p.is_active && (p.role === "supervisor" || p.role === "admin"),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`แก้ไขผู้ใช้: ${fullName(profile)}`} description={profile.email} />
      <Card>
        <CardContent>
          <UserForm profile={profile} supervisors={supervisors} isSelf={profile.id === admin.id} />
        </CardContent>
      </Card>
    </div>
  );
}
