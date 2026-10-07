"use client";

import { useActionState } from "react";
import { resetPassword } from "@/actions/auth";
import { ActionMessage } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

export function ResetPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(resetPassword, {});
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <Field
        label="รหัสผ่านใหม่"
        htmlFor="password"
        error={state.errors?.password}
        hint="อย่างน้อย 8 ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข"
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="ยืนยันรหัสผ่านใหม่" htmlFor="confirm_password" error={state.errors?.confirm_password}>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full">บันทึกรหัสผ่านใหม่</SubmitButton>
    </form>
  );
}
