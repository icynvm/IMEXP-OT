"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate, formatHours } from "@/lib/format";
import { showLocalNotification } from "@/lib/push-client";
import type { ApprovalNotification, ApprovalNotifications } from "@/lib/types";

const POLL_MS = 60_000; // เช็กรายการใหม่ทุก 1 นาที ขณะเปิดเว็บไว้

export const notificationKey = (n: ApprovalNotification) => `${n.kind}-${n.id}`;

/**
 * ข้อมูลกระดิ่งแจ้งเตือน (เฉพาะหัวหน้า/admin — พนักงานได้ initial = null)
 * - เริ่มจากข้อมูลที่ server ส่งมากับหน้า แล้วเช็กใหม่ทุก 1 นาที + ทุกครั้งที่กลับมาที่แท็บนี้
 * - มีรายการใหม่ระหว่างที่ผู้ใช้ดูแท็บอื่นอยู่ -> เด้งแจ้งเตือนที่มุมจอ (ถ้าอนุญาตแล้ว)
 */
export function useApprovalNotifications(initial: ApprovalNotifications | null) {
  const [data, setData] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const known = useRef(new Set((initial?.items ?? []).map(notificationKey)));

  // server ส่งข้อมูลใหม่มา (เช่น หลังกดอนุมัติ) -> ใช้ข้อมูลนั้น
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setData(initial);
  }

  const enabled = initial !== null;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok || !res.headers.get("content-type")?.includes("json")) return;
        const next = (await res.json()) as ApprovalNotifications;
        if (cancelled) return;
        const fresh = next.items.filter((n) => !known.current.has(notificationKey(n)));
        fresh.forEach((n) => known.current.add(notificationKey(n)));
        setData(next);
        // ดูแท็บนี้อยู่ = เห็นกระดิ่งอยู่แล้ว ไม่ต้องเด้ง
        if (document.hidden) {
          for (const n of fresh.slice(0, 3)) {
            await showLocalNotification(n.kind === "request" ? "คำขอทำ OT ใหม่รออนุมัติ" : "คำขอใช้ชั่วโมง OT ใหม่รออนุมัติ", {
              body: `${n.employeeName} · ${formatDate(n.date)} · ${formatHours(n.hours)}`,
              url: "/approvals",
              tag: n.kind === "request" ? `ot-request-${n.id}` : `ot-usage-${n.id}`, // ตรงกับ Push จาก server
            });
          }
        }
      } catch {
        // เน็ตหลุดชั่วคราว: รอบหน้าค่อยลองใหม่
      }
    }

    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return data;
}
