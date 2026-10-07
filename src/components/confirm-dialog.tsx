"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionState } from "@/lib/types";

/**
 * กล่องยืนยันก่อนทำรายการ (Radix AlertDialog)
 * กด "ยืนยัน" แล้วจะส่งฟอร์มไปที่ Server Action พร้อมช่อง hidden ที่กำหนด
 * ถ้าสำเร็จ Server Action จะพาไปหน้าใหม่พร้อมกล่องแจ้งผล / ถ้าไม่สำเร็จจะแสดง error ในกล่องนี้
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive = false,
  action,
  fields,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  /** ช่องกรอกเพิ่มเติมในกล่อง (เช่น หมายเหตุ) */
  children?: (state: ActionState) => React.ReactNode;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}
          </AlertDialogHeader>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {children?.(state)}
          <ActionMessage state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">ปิด</AlertDialogCancel>
            <SubmitButton variant={destructive ? "destructive" : "default"} pendingText="กำลังดำเนินการ...">
              {confirmLabel}
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
