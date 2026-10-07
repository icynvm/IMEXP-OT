"use client";

import { useActionState } from "react";
import { review } from "@/actions/approvals";
import { ActionMessage } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

/** ปุ่ม อนุมัติ / ไม่อนุมัติ พร้อมช่องหมายเหตุ */
export function ReviewForm({ kind, id }: { kind: "request" | "usage"; id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(review.bind(null, kind), {});

  if (state.ok) return <ActionMessage state={state} />;

  return (
    <form action={action} className="space-y-2">
      <ActionMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <Input name="note" placeholder="หมายเหตุ (จำเป็นถ้าไม่อนุมัติ)" maxLength={500} aria-label="หมายเหตุ" />
      {state.errors?.note?.map((m) => (
        <p key={m} className="text-xs text-red-600">
          {m}
        </p>
      ))}
      <div className="flex gap-2">
        <SubmitButton name="decision" value="approve" variant="success" size="sm" pendingText="...">
          อนุมัติ
        </SubmitButton>
        <SubmitButton name="decision" value="reject" variant="danger" size="sm" pendingText="...">
          ไม่อนุมัติ
        </SubmitButton>
      </div>
    </form>
  );
}
