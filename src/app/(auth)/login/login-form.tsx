"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-4">
      <ActionMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <FormField label="อีเมล" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" required defaultValue={state.values?.email} />
      </FormField>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            รหัสผ่าน
          </label>
          <Link href="/forgot-password" className="text-muted-foreground text-xs hover:underline">
            ลืมรหัสผ่าน?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        {state.errors?.password?.map((m) => (
          <p key={m} className="text-destructive text-xs">
            {m}
          </p>
        ))}
      </div>
      <SubmitButton pendingText="กำลังเข้าสู่ระบบ..." className="w-full">
        <LogIn />
        เข้าสู่ระบบ
      </SubmitButton>
    </form>
  );
}
