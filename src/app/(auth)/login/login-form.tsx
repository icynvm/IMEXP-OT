"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { ActionMessage } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="อีเมล" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <Field label="รหัสผ่าน" htmlFor="password" error={state.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pendingText="กำลังเข้าสู่ระบบ..." className="w-full">
        เข้าสู่ระบบ
      </SubmitButton>
    </form>
  );
}
