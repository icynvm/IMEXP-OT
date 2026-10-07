import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getDepartments, getProfileById } from "@/lib/data";
import { AvatarUploader } from "./avatar-uploader";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "โปรไฟล์" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [departments, supervisor] = await Promise.all([getDepartments(), getProfileById(user.supervisor_id)]);
  const department = departments.find((d) => d.id === user.department_id);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="โปรไฟล์" description="แก้ไขชื่อ และตั้งรูปโปรไฟล์ของคุณ" />

      <Card>
        <CardHeader>
          <CardTitle>รูปโปรไฟล์</CardTitle>
          <CardDescription>ไฟล์ JPG, PNG หรือ WebP ระบบตัดเป็นสี่เหลี่ยมจัตุรัสและย่อขนาดให้อัตโนมัติ</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader firstName={user.first_name} avatarPath={user.avatar_path} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          <CardDescription>รหัสพนักงาน อีเมล บทบาท แผนก และหัวหน้า เปลี่ยนได้โดย admin เท่านั้น</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <ProfileForm firstName={user.first_name} lastName={user.last_name} />
          <dl className="grid gap-x-6 gap-y-4 border-t pt-6 text-sm sm:grid-cols-2">
            <Info label="รหัสพนักงาน" value={user.employee_code} />
            <Info label="อีเมล" value={user.email} />
            <Info label="บทบาท" value={ROLE_LABELS[user.role]} />
            <Info label="แผนก" value={department?.name ?? "-"} />
            <Info label="หัวหน้าผู้อนุมัติ" value={supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : "-"} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium break-all">{value}</dd>
    </div>
  );
}
