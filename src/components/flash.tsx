import { Alert } from "@/components/ui/alert";

/** แสดงข้อความแจ้งผลที่ส่งมากับ URL (?message=...) หลังบันทึกสำเร็จ */
export function Flash({ message }: { message?: string | string[] }) {
  if (typeof message !== "string" || !message) return null;
  return (
    <div className="mb-4">
      <Alert tone="success">{message}</Alert>
    </div>
  );
}
