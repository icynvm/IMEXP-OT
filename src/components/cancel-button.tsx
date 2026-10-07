"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/types";

/** ปุ่มยกเลิกคำขอ (ถามยืนยันก่อน) */
export function CancelButton({
  id,
  onCancel,
}: {
  id: string;
  onCancel: (id: string) => Promise<ActionState>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("ต้องการยกเลิกคำขอนี้ใช่หรือไม่?")) return;
          startTransition(async () => {
            const result = await onCancel(id);
            setError(result.ok ? undefined : result.message);
          });
        }}
      >
        {pending ? "กำลังยกเลิก..." : "ยกเลิก"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
