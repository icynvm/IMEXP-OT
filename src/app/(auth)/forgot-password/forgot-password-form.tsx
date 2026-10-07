"use client";

import { useActionState } from "react";
import { forgotPassword } from "@/actions/auth";
import { ActionMessage } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(forgotPassword, {});
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <Field label="อีเมล" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <SubmitButton pendingText="กำลังส่ง..." className="w-full">
        ส่งลิงก์ตั้งรหัสผ่านใหม่
      </SubmitButton>
    </form>
  );
}
