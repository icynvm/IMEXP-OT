// โครงหน้าสำหรับ หน้า login / สมัคร / ลืมรหัสผ่าน
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-blue-700">ระบบขอ OT</p>
          <p className="text-sm text-gray-500">ขอทำ OT · ใช้ชั่วโมงสะสม · ติดตามยอดคงเหลือ</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
