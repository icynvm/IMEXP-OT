"use client";

import { createContext, useTransition } from "react";

/** บอกปุ่ม SubmitButton ว่าฟอร์มกำลังส่งอยู่ (ใช้คู่กับ ActionForm) */
export const ActionFormPendingContext = createContext(false);

/**
 * ฟอร์มที่ส่งข้อมูลไป Server Action โดย "ไม่ล้างค่าในฟอร์ม" หลังส่ง
 *
 * ทำไมต้องมี: <form action={...}> ปกติของ React จะสั่ง reset ฟอร์มทุกครั้งหลังส่ง
 * ทำให้ช่องเลือกของ Radix (Select / RadioGroup / Checkbox) เด้งกลับเป็นค่าเริ่มต้น
 * ผู้ใช้จะเห็นค่าที่ไม่ได้เลือกไว้ หลังบันทึกไม่สำเร็จ — ใช้ฟอร์มนี้กับหน้าที่มีช่องเลือกเหล่านั้น
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (formData: FormData) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ActionFormPendingContext value={pending}>
      <form
        {...props}
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const formData = new FormData(event.currentTarget, submitter);
          startTransition(() => action(formData));
        }}
      >
        {children}
      </form>
    </ActionFormPendingContext>
  );
}
