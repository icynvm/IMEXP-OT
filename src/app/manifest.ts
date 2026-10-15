import type { MetadataRoute } from "next";

/**
 * PWA: ข้อมูลสำหรับ "ติดตั้งเป็นแอป" บนมือถือ/คอม (เพิ่มไปยังหน้าจอหลัก)
 * ไอคอนอยู่ใน public/icons/ (สร้างจาก public/favicon.webp — เปลี่ยนโลโก้ได้โดยแทนที่ไฟล์ขนาดเดิม)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ระบบขอ OT — IMPACT ORGANIZER",
    short_name: "ระบบ OT",
    description: "ขอทำ OT, ใช้ชั่วโมง OT สะสม และอนุมัติคำขอ",
    lang: "th",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9fafb",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "ขอทำ OT", url: "/ot-requests/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "ขอใช้ชั่วโมง OT", url: "/ot-usages/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "รออนุมัติ", url: "/approvals", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
