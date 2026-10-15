"use client";

import { CircleCheck, Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isStandalone } from "@/lib/push-client";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * ปุ่ม "ติดตั้งเป็นแอป" (PWA)
 * - Chrome / Edge / Android: กดแล้วเบราว์เซอร์ถามยืนยันการติดตั้ง
 * - iPhone / iPad (Safari): ไม่มีปุ่มติดตั้งอัตโนมัติ -> บอกวิธี "เพิ่มไปยังหน้าจอโฮม"
 */
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"installed" | "ios" | "other" | null>(null);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const onPrompt = (e: Event) => {
      e.preventDefault(); // เก็บไว้ให้ผู้ใช้กดปุ่มของเราเอง
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setMode("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // อ่านสถานะหลัง mount (ค่าเหล่านี้มีเฉพาะในเบราว์เซอร์)
    queueMicrotask(() => setMode(isStandalone() ? "installed" : ios ? "ios" : "other"));
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === null) return null;
  if (mode === "installed") {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700">
        <CircleCheck className="size-4" />
        กำลังใช้งานแบบแอปอยู่
      </p>
    );
  }
  if (mode === "ios") {
    return (
      <p className="text-muted-foreground text-sm">
        iPhone/iPad: เปิดเว็บนี้ด้วย Safari → กดปุ่มแชร์ <Share className="inline size-4 align-text-bottom" /> → &quot;เพิ่มไปยังหน้าจอโฮม&quot;
      </p>
    );
  }
  if (!prompt) {
    return <p className="text-muted-foreground text-sm">ติดตั้งได้จากเมนูของเบราว์เซอร์ (ไอคอนติดตั้งที่ช่องที่อยู่เว็บ หรือ &quot;เพิ่มไปยังหน้าจอหลัก&quot;)</p>;
  }
  return (
    <Button
      type="button"
      size="sm"
      onClick={async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") setMode("installed");
        setPrompt(null);
      }}
    >
      <Download />
      ติดตั้งแอปบนอุปกรณ์นี้
    </Button>
  );
}
