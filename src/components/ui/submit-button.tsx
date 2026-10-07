"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** ปุ่มส่งฟอร์ม: กดแล้วปิดปุ่มชั่วคราว กันกดซ้ำ */
export function SubmitButton({
  children,
  pendingText = "กำลังบันทึก...",
  variant = "primary",
  size = "md",
  name,
  value,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md";
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      name={name}
      value={value}
      className={className}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
