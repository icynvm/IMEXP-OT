/*
 * Service Worker ของระบบขอ OT (PWA)
 *  - รับ Web Push จาก server แล้วแสดงเป็นการแจ้งเตือนของระบบ (มุมจอคอม / แถบแจ้งเตือนมือถือ)
 *    แม้ปิดหน้าเว็บอยู่ (บน iPhone ต้องติดตั้งเป็นแอปก่อน)
 *  - กดที่การแจ้งเตือน -> เปิดหน้าที่เกี่ยวข้อง (ถ้าเปิดเว็บค้างไว้จะใช้หน้าต่างเดิม)
 *  - ไม่มีอินเทอร์เน็ต -> แสดงหน้า offline.html แทนหน้าเบราว์เซอร์ error
 * ไฟล์นี้ต้องอยู่ที่ /sw.js (ราก) เพื่อดูแลได้ทุกหน้า / แก้แล้วผู้ใช้จะได้เวอร์ชันใหม่อัตโนมัติ
 */
const OFFLINE_CACHE = "ot-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// เปลี่ยนหน้า (navigation) แล้วเน็ตหลุด -> หน้า offline / อย่างอื่นปล่อยให้เบราว์เซอร์จัดการตามปกติ (ไม่ cache ข้อมูล)
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ระบบขอ OT";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag, // tag เดียวกัน = แทนที่ของเดิม ไม่เด้งซ้ำ
      data: { url: data.url || "/dashboard" },
      lang: "th",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) return existing.navigate(url).then((w) => (w || existing).focus());
      return self.clients.openWindow(url);
    }),
  );
});
