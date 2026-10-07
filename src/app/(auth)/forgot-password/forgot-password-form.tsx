"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";
import { forgotPassword } from "@/actions/auth";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(forgotPassword, {});
  return (
    <form action={action} className="grid gap-4">
      <ActionMessage state={state} />
      <FormField label="อีเมล" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" required defaultValue={state.values?.email} />
      </FormField>
      <SubmitButton pendingText="กำลังส่ง..." className="w-full">
        <Mail />
        ส่งลิงก์ตั้งรหัสผ่านใหม่
      </SubmitButton>
    </form>
  );
}
