"use client";

import { Check, X } from "lucide-react";
import { review } from "@/actions/approvals";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * ปุ่ม อนุมัติ / ไม่อนุมัติ — กดแล้วเปิดกล่องยืนยัน (Radix AlertDialog)
 * ไม่อนุมัติ ต้องระบุเหตุผลเสมอ (ตรวจซ้ำที่ Server Action)
 */
export function ReviewForm({ kind, id, summary }: { kind: "request" | "usage"; id: string; summary: string }) {
  const action = review.bind(null, kind);
  return (
    <div className="flex gap-2">
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <X />
            ไม่อนุมัติ
          </Button>
        }
        title="ไม่อนุมัติคำขอนี้?"
        description={summary}
        confirmLabel="ยืนยันไม่อนุมัติ"
        destructive
        action={action}
        fields={{ id, decision: "reject" }}
      >
        {(state) => (
          <FormField label="เหตุผลที่ไม่อนุมัติ" htmlFor={`note-reject-${id}`} error={state.errors?.note} required>
            <Textarea id={`note-reject-${id}`} name="note" maxLength={500} placeholder="พนักงานจะเห็นเหตุผลนี้ในอีเมล" />
          </FormField>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        trigger={
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Check />
            อนุมัติ
          </Button>
        }
        title="อนุมัติคำขอนี้?"
        description={summary}
        confirmLabel="ยืนยันอนุมัติ"
        action={action}
        fields={{ id, decision: "approve" }}
      >
        {(state) => (
          <FormField label="หมายเหตุ (ไม่บังคับ)" htmlFor={`note-approve-${id}`} error={state.errors?.note}>
            <Textarea id={`note-approve-${id}`} name="note" maxLength={500} />
          </FormField>
        )}
      </ConfirmDialog>
    </div>
  );
}
