import { redirect } from "next/navigation";

// หน้าแรก: ส่งไปหน้าภาพรวม (ถ้ายังไม่ login, proxy จะพาไปหน้า login เอง)
export default function Home() {
  redirect("/dashboard");
}
