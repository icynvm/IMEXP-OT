"use client";

import { ImageUp, Loader2, Save, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { removeAvatar, uploadAvatar } from "@/actions/profile";
import { ActionMessage } from "@/components/action-message";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import type { ActionState } from "@/lib/types";

const SIZE = 512; // ย่อรูปเป็น 512x512 px (คมพอสำหรับรูปโปรไฟล์ และไฟล์เล็ก อัปโหลดเร็ว)

/**
 * ตัดรูปให้เป็นสี่เหลี่ยมจัตุรัส (เอาตรงกลาง) แล้วย่อ — ทำในเครื่องผู้ใช้ก่อนอัปโหลด
 * ทำไม: รูปจากมือถือมักใหญ่หลาย MB ส่งตรง ๆ จะช้าและเกินขนาดที่ server รับ
 */
async function resizeToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // เปิดไฟล์ไม่ได้ (เช่น HEIC บางเครื่อง) จะ error
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  // เบราว์เซอร์ที่สร้าง WebP ไม่ได้ จะได้ PNG กลับมาแทน (รองรับทั้งคู่)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("toBlob failed");
  return blob;
}

/** ตั้ง / เปลี่ยน / ลบรูปโปรไฟล์ */
export function AvatarUploader({ firstName, avatarPath }: { firstName: string; avatarPath: string | null }) {
  const [state, formAction] = useActionState<ActionState, FormData>(uploadAvatar, {});
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // คืนหน่วยความจำของรูปตัวอย่างเมื่อเปลี่ยนรูป / ออกจากหน้า
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    setLocalError(null);
    if (!file.type.startsWith("image/")) {
      setLocalError("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    setProcessing(true);
    try {
      const blob = await resizeToSquare(file);
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setLocalError("เปิดไฟล์รูปนี้ไม่ได้ กรุณาใช้ไฟล์ JPG หรือ PNG");
    } finally {
      setProcessing(false);
    }
  }

  function save() {
    if (!preview) return;
    const formData = new FormData();
    const ext = preview.blob.type === "image/png" ? "png" : "webp";
    formData.append("avatar", preview.blob, `avatar.${ext}`);
    startTransition(() => formAction(formData));
  }

  const busy = pending || processing;

  return (
    <div className="grid gap-4">
      {localError ? <ActionMessage state={{ ok: false, message: localError }} /> : <ActionMessage state={state} />}
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <UserAvatar
          firstName={firstName}
          avatarPath={avatarPath}
          src={preview?.url}
          className="size-24"
          textClassName="text-3xl"
        />
        <div className="grid w-full gap-2 sm:w-auto">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} data-testid="avatar-input" />
          {preview ? (
            <>
              <p className="text-muted-foreground text-sm">ตัวอย่างรูปใหม่ — กดบันทึกเพื่อใช้รูปนี้</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={save} disabled={busy}>
                  {pending ? <Loader2 className="animate-spin" /> : <Save />}
                  {pending ? "กำลังอัปโหลด..." : "บันทึกรูป"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setPreview(null)} disabled={busy}>
                  <X />
                  ยกเลิก
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
                {processing ? <Loader2 className="animate-spin" /> : <ImageUp />}
                {avatarPath ? "เปลี่ยนรูป" : "เลือกรูป"}
              </Button>
              {avatarPath && (
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="ghost" className="text-destructive">
                      <Trash2 />
                      ลบรูป
                    </Button>
                  }
                  title="ลบรูปโปรไฟล์?"
                  description="ระบบจะแสดงตัวอักษรแรกของชื่อแทนรูป"
                  confirmLabel="ยืนยันการลบ"
                  destructive
                  action={() => removeAvatar()}
                  fields={{}}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
