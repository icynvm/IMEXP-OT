"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { saveSignupDomains } from "@/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";

/** ตั้งโดเมนอีเมลที่สมัครได้ (กันคนนอกบริษัทสมัครเข้ามาดูข้อมูล) */
export function SignupDomainsForm({ domains }: { domains: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSignupDomains, {});
  return (
    <form action={action} className="grid gap-3">
      <ActionMessage state={state} />
      <FormField
        label="โดเมนอีเมลที่สมัครได้"
        htmlFor="domains"
        hint={domains.length ? `ตอนนี้: สมัครได้เฉพาะ ${domains.map((d) => `@${d}`).join(", ")}` : "ตอนนี้: ใครก็สมัครได้ (ทุกโดเมน) — แนะนำให้ใส่โดเมนของบริษัท"}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="domains" name="domains" placeholder="เช่น company.co.th, company.com" defaultValue={state.values?.domains ?? domains.join(", ")} />
          <SubmitButton className="shrink-0">
            <Save />
            บันทึก
          </SubmitButton>
        </div>
      </FormField>
    </form>
  );
}
