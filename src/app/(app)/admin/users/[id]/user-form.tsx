"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateUser } from "@/actions/admin";
import { ActionMessage } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_LABELS } from "@/lib/constants";
import type { ActionState, Profile, Role } from "@/lib/types";

export function UserForm({
  profile,
  supervisors,
  isSelf,
}: {
  profile: Profile;
  supervisors: Profile[];
  isSelf: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateUser, {});
  const v = state.values;
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <input type="hidden" name="user_id" value={profile.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อ" htmlFor="first_name" error={e.first_name} required>
          <Input id="first_name" name="first_name" required defaultValue={v?.first_name ?? profile.first_name} />
        </Field>
        <Field label="นามสกุล" htmlFor="last_name" error={e.last_name} required>
          <Input id="last_name" name="last_name" required defaultValue={v?.last_name ?? profile.last_name} />
        </Field>
      </div>

      <Field label="รหัสพนักงาน" htmlFor="employee_code" error={e.employee_code} required>
        <Input id="employee_code" name="employee_code" required defaultValue={v?.employee_code ?? profile.employee_code} />
      </Field>

      <Field
        label="บทบาท"
        htmlFor="role"
        error={e.role}
        hint={isSelf ? "ไม่สามารถเปลี่ยนบทบาทของตัวเองได้" : "หัวหน้างาน = อนุมัติคำขอของลูกทีมได้ / ผู้ดูแลระบบ = เห็นและจัดการได้ทั้งหมด"}
        required
      >
        <Select id="role" name="role" defaultValue={v?.role ?? profile.role} disabled={isSelf}>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        {/* select ที่ disabled จะไม่ถูกส่งไปกับฟอร์ม จึงต้องส่งค่าเดิมแทน */}
        {isSelf && <input type="hidden" name="role" value={profile.role} />}
      </Field>

      <Field label="หัวหน้าผู้อนุมัติ" htmlFor="supervisor_id" error={e.supervisor_id} hint="ผู้ที่จะได้รับอีเมลและอนุมัติคำขอของผู้ใช้นี้">
        <Select id="supervisor_id" name="supervisor_id" defaultValue={v?.supervisor_id ?? profile.supervisor_id ?? ""}>
          <option value="">— ไม่มี (ส่งให้ admin พิจารณา) —</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.employee_code} - {s.first_name} {s.last_name} ({ROLE_LABELS[s.role]})
            </option>
          ))}
        </Select>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={v ? v.is_active === "on" : profile.is_active}
          disabled={isSelf}
          className="h-4 w-4"
        />
        เปิดใช้งานบัญชี (ปิด = เข้าสู่ระบบแล้วใช้งานไม่ได้ ข้อมูลเดิมยังอยู่ครบ)
      </label>
      {isSelf && <input type="hidden" name="is_active" value="on" />}

      <div className="flex gap-2">
        <SubmitButton>บันทึก</SubmitButton>
        <Link href="/admin/users" className={buttonClass("secondary")}>
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
