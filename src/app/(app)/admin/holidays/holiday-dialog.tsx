"use client";

import { Save } from "lucide-react";
import { useActionState, useState } from "react";
import { saveHoliday } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { ActionMessage } from "@/components/action-message";
import { DatePicker } from "@/components/calendar/date-picker";
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
import type { ActionState, PublicHoliday } from "@/lib/types";

/** กล่องเพิ่ม / แก้ไขวันหยุดนักขัตฤกษ์ */
export function HolidayDialog({
  trigger,
  holiday,
  defaultDate,
  today,
}: {
  trigger: React.ReactNode;
  /** ไม่ส่ง = เพิ่มวันหยุดใหม่ */
  holiday?: PublicHoliday;
  defaultDate: string;
  today: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveHoliday, {});
  const [date, setDate] = useState(holiday?.holiday_date ?? defaultDate);
  const e = state.errors ?? {};

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <ActionForm action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{holiday ? "แก้ไขวันหยุด" : "เพิ่มวันหยุด"}</DialogTitle>
            <DialogDescription>วันหยุดจะแสดงในปฏิทินของทุกคน (สีแดง)</DialogDescription>
          </DialogHeader>
          <ActionMessage state={state} />
          <FormField label="วันที่" htmlFor="holiday_date" error={e.holiday_date} required>
            {holiday ? (
              // แก้ไข: เปลี่ยนได้เฉพาะชื่อ (ถ้าวันที่ผิด ให้ลบแล้วเพิ่มใหม่)
              <>
                <input type="hidden" name="holiday_date" value={holiday.holiday_date} />
                <Input id="holiday_date" value={new Date(`${holiday.holiday_date}T12:00:00Z`).toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "UTC" })} disabled />
              </>
            ) : (
              <DatePicker id="holiday_date" name="holiday_date" value={date} onChange={setDate} today={today} />
            )}
          </FormField>
          <FormField label="ชื่อวันหยุด" htmlFor="holiday_name" error={e.name} required>
            <Input id="holiday_name" name="name" required maxLength={200} defaultValue={state.values?.name ?? holiday?.name} placeholder="เช่น วันหยุดชดเชยวันสงกรานต์" />
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
