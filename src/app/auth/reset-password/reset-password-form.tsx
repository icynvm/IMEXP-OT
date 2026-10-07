"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";
import { resetPassword } from "@/actions/auth";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";

export function ResetPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(resetPassword, {});
  return (
    <form action={action} className="grid gap-4">
      <ActionMessage state={state} />
      <FormField
        label="รหัสผ่านใหม่"
        htmlFor="password"
        error={state.errors?.password}
        hint="อย่างน้อย 8 ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข"
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </FormField>
      <FormField label="ยืนยันรหัสผ่านใหม่" htmlFor="confirm_password" error={state.errors?.confirm_password}>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </FormField>
      <SubmitButton className="w-full">
        <KeyRound />
        บันทึกรหัสผ่านใหม่
      </SubmitButton>
    </form>
  );
}
