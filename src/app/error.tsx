"use client";

import { ErrorView } from "@/components/error-view";

// แสดงเมื่อเกิดข้อผิดพลาดที่ไม่คาดคิด (หน้า login / สมัคร ฯลฯ — หน้าหลัง login ใช้ (app)/error.tsx ที่ยังมีเมนู)
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <ErrorView error={error} retry={retry} />
    </main>
  );
}
