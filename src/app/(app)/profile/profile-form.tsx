"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { updateProfile } from "@/actions/profile";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";

/** ฟอร์มแก้ชื่อ-นามสกุลของตัวเอง */
export function ProfileForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  return (
    <form action={action} className="grid gap-4">
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="ชื่อ" htmlFor="first_name" error={e.first_name} required>
          <Input id="first_name" name="first_name" autoComplete="given-name" maxLength={100} required defaultValue={v.first_name ?? firstName} />
        </FormField>
        <FormField label="นามสกุล" htmlFor="last_name" error={e.last_name} required>
          <Input id="last_name" name="last_name" autoComplete="family-name" maxLength={100} required defaultValue={v.last_name ?? lastName} />
        </FormField>
      </div>
      <div className="flex justify-end">
        <SubmitButton>
          <Save />
          บันทึก
        </SubmitButton>
      </div>
    </form>
  );
}
