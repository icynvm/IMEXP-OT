"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { updateUser } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import type { ActionState, Department, Profile, Role } from "@/lib/types";

/** ค่าในช่อง "หัวหน้า" / "แผนก" เมื่อไม่ได้เลือก (Radix Select ห้ามใช้ค่าว่าง) */
const NO_SUPERVISOR = "none";

export function UserForm({
  profile,
  supervisors,
  departments,
  isSelf,
}: {
  profile: Profile;
  supervisors: Profile[];
  departments: Department[];
  isSelf: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateUser, {});
  const e = state.errors ?? {};

  // ช่องเลือกเก็บค่าใน state + ส่งผ่าน hidden input เพื่อให้ค่าที่เลือกไม่หายเมื่อบันทึกไม่สำเร็จ
  const [role, setRole] = useState<string>(profile.role);
  const [supervisorId, setSupervisorId] = useState<string>(profile.supervisor_id ?? NO_SUPERVISOR);
  const [departmentId, setDepartmentId] = useState<string>(profile.department_id ?? NO_SUPERVISOR);
  const [isActive, setIsActive] = useState(profile.is_active);
  const v = state.values;

  return (
    <ActionForm action={action} className="grid gap-5">
      <ActionMessage state={state} />
      <input type="hidden" name="user_id" value={profile.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="ชื่อ" htmlFor="first_name" error={e.first_name} required>
          <Input id="first_name" name="first_name" required defaultValue={v?.first_name ?? profile.first_name} />
        </FormField>
        <FormField label="นามสกุล" htmlFor="last_name" error={e.last_name} required>
          <Input id="last_name" name="last_name" required defaultValue={v?.last_name ?? profile.last_name} />
        </FormField>
      </div>

      <FormField label="รหัสพนักงาน" htmlFor="employee_code" error={e.employee_code} required>
        <Input id="employee_code" name="employee_code" required defaultValue={v?.employee_code ?? profile.employee_code} />
      </FormField>

      <FormField
        label="บทบาท"
        htmlFor="role"
        error={e.role}
        hint={
          isSelf
            ? "ไม่สามารถเปลี่ยนบทบาทของตัวเองได้"
            : "หัวหน้าทีม = อนุมัติลูกทีม / หัวหน้าแผนก = อนุมัติทุกคนในแผนก / ผู้ดูแลระบบ = ทุกอย่าง (หัวหน้าทุกระดับ คำขอของตัวเองอนุมัติอัตโนมัติ)"
        }
        required
      >
        <input type="hidden" name="role" value={role} />
        <Select value={role} onValueChange={setRole} disabled={isSelf}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="แผนก" htmlFor="department_id" error={e.department_id} hint="หัวหน้าแผนกจะเห็นและอนุมัติคำขอของทุกคนในแผนก">
        <input type="hidden" name="department_id" value={departmentId} />
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger id="department_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SUPERVISOR}>ไม่มีแผนก</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="หัวหน้าผู้อนุมัติ" htmlFor="supervisor_id" error={e.supervisor_id} hint="ผู้ที่จะได้รับอีเมลและอนุมัติคำขอของผู้ใช้นี้">
        <input type="hidden" name="supervisor_id" value={supervisorId} />
        <Select value={supervisorId} onValueChange={setSupervisorId}>
          <SelectTrigger id="supervisor_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SUPERVISOR}>ไม่มี (ส่งให้หัวหน้าแผนก / admin พิจารณา)</SelectItem>
            {supervisors.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.employee_code} · {s.first_name} {s.last_name} ({ROLE_LABELS[s.role]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex items-start gap-3 rounded-lg border p-4">
        {isActive && <input type="hidden" name="is_active" value="on" />}
        <Checkbox
          id="is_active"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
          disabled={isSelf}
        />
        <div className="grid gap-1">
          <Label htmlFor="is_active">เปิดใช้งานบัญชี</Label>
          <p className="text-muted-foreground text-xs">ปิด = เข้าสู่ระบบแล้วใช้งานไม่ได้ ข้อมูลเดิมยังอยู่ครบ</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/admin/users">ยกเลิก</Link>
        </Button>
        <SubmitButton>
          <Save />
          บันทึก
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
