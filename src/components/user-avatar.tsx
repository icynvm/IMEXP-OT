"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** รูปโปรไฟล์ — ถ้ายังไม่ตั้งรูป (หรือโหลดรูปไม่ได้) แสดงตัวอักษรแรกของชื่อแทน */
export function UserAvatar({
  firstName,
  avatarPath,
  src,
  className,
  textClassName,
}: {
  firstName: string;
  avatarPath?: string | null;
  /** ใช้แทน avatarPath เมื่อต้องการแสดงรูปที่ยังไม่ได้บันทึก (ตัวอย่างก่อนอัปโหลด) */
  src?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const url = src ?? avatarUrl(avatarPath);
  return (
    <Avatar className={cn("size-9", className)}>
      {url && <AvatarImage src={url} alt={`รูปโปรไฟล์ของ ${firstName}`} className="object-cover" />}
      <AvatarFallback className={cn("bg-primary/10 text-primary text-sm", textClassName)}>{firstName.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
}
