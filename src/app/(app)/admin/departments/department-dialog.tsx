"use client";

import { Save } from "lucide-react";
import { useActionState, useState } from "react";
import { saveDepartment } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionState, Department } from "@/lib/types";

const NO_HEAD = "none";

/** กล่องสร้าง / แก้ไขแผนก (Radix Dialog) */
export function DepartmentDialog({
  trigger,
  department,
  headOptions,
}: {
  trigger: React.ReactNode;
  /** ไม่ส่ง = สร้างแผนกใหม่ */
  department?: Department;
  /** ผู้ใช้บทบาท "หัวหน้าแผนก" ที่เลือกได้ */
  headOptions: { id: string; label: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveDepartment, {});
  const [headId, setHeadId] = useState(department?.head_id ?? NO_HEAD);
  const e = state.errors ?? {};

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <ActionForm action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{department ? "แก้ไขแผนก" : "สร้างแผนกใหม่"}</DialogTitle>
            <DialogDescription>หัวหน้าแผนกจะเห็นและอนุมัติคำขอของทุกคนในแผนก</DialogDescription>
          </DialogHeader>
          <ActionMessage state={state} />
          <input type="hidden" name="id" value={department?.id ?? ""} />
          <FormField label="ชื่อแผนก" htmlFor={`dept-name-${department?.id ?? "new"}`} error={e.name} required>
            <Input
              id={`dept-name-${department?.id ?? "new"}`}
              name="name"
              required
              maxLength={100}
              defaultValue={state.values?.name ?? department?.name}
              placeholder="เช่น บัญชี, ฝ่ายขาย"
            />
          </FormField>
          <FormField
            label="หัวหน้าแผนก"
            htmlFor={`dept-head-${department?.id ?? "new"}`}
            error={e.head_id}
            hint='เลือกได้เฉพาะผู้ใช้ที่มีบทบาท "หัวหน้าแผนก" (ตั้งบทบาทในหน้าจัดการผู้ใช้)'
          >
            <input type="hidden" name="head_id" value={headId} />
            <Select value={headId} onValueChange={setHeadId}>
              <SelectTrigger id={`dept-head-${department?.id ?? "new"}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_HEAD}>ยังไม่กำหนด</SelectItem>
                {headOptions.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                ปิด
              </Button>
            </DialogClose>
            <SubmitButton>
              <Save />
              บันทึก
            </SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
