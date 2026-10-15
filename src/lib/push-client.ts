"use client";

import { deletePushSubscription, savePushSubscription } from "@/actions/push";

/**
 * ตัวช่วยฝั่งเบราว์เซอร์: Service Worker (PWA) + การแจ้งเตือนของระบบปฏิบัติการ
 * (เด้งที่มุมจอคอม / แถบแจ้งเตือนมือถือ)
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushState =
  | "unsupported" // เบราว์เซอร์ไม่รองรับ
  | "ios-install" // iPhone/iPad: ต้อง "เพิ่มไปยังหน้าจอโฮม" ก่อน จึงจะแจ้งเตือนได้
  | "denied" // ผู้ใช้กดบล็อกไว้ ต้องไปเปิดในตั้งค่าเบราว์เซอร์
  | "off"
  | "on";

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** ลงทะเบียน Service Worker (เรียกครั้งเดียวตอนเปิดเว็บหลัง login) */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch (err) {
    console.warn("[pwa] ลงทะเบียน service worker ไม่สำเร็จ", err);
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  // ไม่มี VAPID key (ยังไม่ตั้งค่า Push) -> แจ้งเตือนได้เฉพาะตอนเปิดเว็บค้างไว้ ถือว่า "เปิด" แล้ว
  if (!VAPID_PUBLIC_KEY || !("PushManager" in window)) return "on";
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) ? "on" : "off";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** เปิดการแจ้งเตือน: ขอสิทธิ์ -> สมัคร Push -> บันทึกอุปกรณ์นี้ที่ server */
export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "ยังไม่ได้อนุญาตการแจ้งเตือน (ถ้ากดบล็อกไว้ ให้เปิดในตั้งค่าเบราว์เซอร์)" };
  }
  if (!VAPID_PUBLIC_KEY || !("PushManager" in window)) return { ok: true };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
    return await savePushSubscription(subscription.toJSON());
  } catch (err) {
    console.warn("[push] สมัครไม่สำเร็จ", err);
    return { ok: false, message: "เปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

/** ปิดการแจ้งเตือนบนอุปกรณ์นี้ */
export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager?.getSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
}

/**
 * แสดงการแจ้งเตือนของระบบจากหน้าเว็บเอง (ใช้ตอนเปิดเว็บค้างไว้แต่ดูแท็บอื่นอยู่)
 * tag เดียวกับ Push จาก server -> ถ้าได้รับ Push ไปแล้วจะไม่เด้งซ้ำ
 */
export async function showLocalNotification(title: string, options: { body: string; url: string; tag: string }) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker?.getRegistration();
  const payload = { body: options.body, tag: options.tag, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", data: { url: options.url } };
  if (registration) await registration.showNotification(title, payload);
  else new Notification(title, payload);
}
