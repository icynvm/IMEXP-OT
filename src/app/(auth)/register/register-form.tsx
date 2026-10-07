"use client";

import { useActionState } from "react";
import { register } from "@/actions/auth";
import { ActionMessage } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

export function RegisterForm() {
  const [state, action] = useActionState<ActionState, FormData>(register, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อ" htmlFor="first_name" error={e.first_name} required>
          <Input id="first_name" name="first_name" autoComplete="given-name" required defaultValue={v.first_name} />
        </Field>
        <Field label="นามสกุล" htmlFor="last_name" error={e.last_name} required>
          <Input id="last_name" name="last_name" autoComplete="family-name" required defaultValue={v.last_name} />
        </Field>
      </div>
      <Field label="อีเมล" htmlFor="email" error={e.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} />
      </Field>
      <Field label="รหัสพนักงาน" htmlFor="employee_code" error={e.employee_code} required>
        <Input id="employee_code" name="employee_code" required defaultValue={v.employee_code} placeholder="เช่น EMP001" />
      </Field>
      <Field
        label="รหัสผ่าน"
        htmlFor="password"
        error={e.password}
        hint="อย่างน้อย 8 ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข"
        required
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="ยืนยันรหัสผ่าน" htmlFor="confirm_password" error={e.confirm_password} required>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton pendingText="กำลังสมัคร..." className="w-full">
        สมัครสมาชิก
      </SubmitButton>
    </form>
  );
}
