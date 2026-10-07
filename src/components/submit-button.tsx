"use client";

import { Loader2 } from "lucide-react";
import { use } from "react";
import { useFormStatus } from "react-dom";
import { ActionFormPendingContext } from "@/components/action-form";
import { Button } from "@/components/ui/button";

/** ปุ่มส่งฟอร์ม: ระหว่างส่งจะหมุนและกดซ้ำไม่ได้ */
export function SubmitButton({
  children,
  pendingText = "กำลังบันทึก...",
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending: formPending } = useFormStatus();
  const pending = formPending || use(ActionFormPendingContext);
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
