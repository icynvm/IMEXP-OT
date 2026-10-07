import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">สมัครสมาชิก</h1>
      <RegisterForm />
      <p className="mt-6 text-center text-sm">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="text-blue-700 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
