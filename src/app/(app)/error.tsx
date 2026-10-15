"use client";

import { ErrorView } from "@/components/error-view";

// ข้อผิดพลาดในหน้าหลัง login: แสดงในกรอบเนื้อหา เมนูด้านซ้ายยังอยู่ ผู้ใช้ไปหน้าอื่นต่อได้
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
