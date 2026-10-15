"use client";

import { BellOff, BellRing, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { disablePush, enablePush, getPushState, showLocalNotification, type PushState } from "@/lib/push-client";
import { cn } from "@/lib/utils";

/**
 * ปุ่มเปิด/ปิด "แจ้งเตือนบนอุปกรณ์นี้" (เด้งที่มุมจอคอม / แถบแจ้งเตือนมือถือ)
 * ต้องเปิดแยกทีละอุปกรณ์ เพราะเบราว์เซอร์ขอสิทธิ์แยกกัน
 */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState, () => setState("unsupported"));
  }, []);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      if (state === "on") {
        await disablePush();
      } else {
        const result = await enablePush();
        if (!result.ok) setMessage(result.message ?? null);
      }
      setState(await getPushState());
    } finally {
      setBusy(false);
    }
  }

  if (state === null) return null;

  const text: Record<PushState, string> = {
    on: "เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว",
    off: "รับการแจ้งเตือนที่มุมจอ แม้ไม่ได้เปิดเว็บไว้",
    denied: "การแจ้งเตือนถูกบล็อก — เปิดได้ที่ตั้งค่าของเบราว์เซอร์ (ไอคอนแม่กุญแจหน้าที่อยู่เว็บ)",
    unsupported: "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน",
    "ios-install": "iPhone/iPad: กดปุ่มแชร์ → \"เพิ่มไปยังหน้าจอโฮม\" แล้วเปิดจากไอคอน จึงจะเปิดการแจ้งเตือนได้",
  };

  return (
    <div className={cn("grid gap-2", compact && "text-xs")}>
      <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{text[state]}</p>
      {(state === "on" || state === "off") && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={state === "on" ? "outline" : "default"} onClick={toggle} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : state === "on" ? <BellOff /> : <BellRing />}
            {state === "on" ? "ปิดการแจ้งเตือน" : "เปิดการแจ้งเตือน"}
          </Button>
          {state === "on" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => showLocalNotification("ทดสอบการแจ้งเตือน", { body: "ถ้าเห็นข้อความนี้ แปลว่าใช้งานได้แล้ว", url: "/dashboard", tag: "test" })}
            >
              <Send />
              ทดสอบ
            </Button>
          )}
        </div>
      )}
      {message && <p className="text-destructive text-xs">{message}</p>}
    </div>
  );
}
