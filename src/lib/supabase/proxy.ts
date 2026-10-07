import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configErrorPage, findConfigProblems } from "@/lib/config-check";

/** หน้าที่เข้าได้โดยไม่ต้อง login */
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/auth"];
/** หน้าที่ถ้า login แล้วไม่ต้องเข้าอีก (เด้งไป dashboard) */
const GUEST_ONLY_PATHS = ["/login", "/register", "/forgot-password"];

function startsWithAny(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * ทำงานก่อนทุกหน้า:
 *  1) ต่ออายุ session (cookie) ของ Supabase
 *  2) ถ้ายังไม่ login แล้วเข้าหน้าที่ต้อง login -> ส่งไปหน้า /login
 *
 * หมายเหตุ: การตรวจ "บทบาท" (admin/หัวหน้า) ทำในหน้าเว็บและในฐานข้อมูล ไม่ใช่ที่นี่
 */
export async function updateSession(request: NextRequest) {
  // ตั้งค่ายังไม่ครบ -> แสดงหน้าบอกว่าขาดอะไร (ไม่งั้นจะเห็นแค่ "Internal Server Error")
  const problems = findConfigProblems();
  if (problems.length > 0) {
    console.error("[config]", problems.join(" | "));
    return new NextResponse(configErrorPage(problems), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // สำคัญ: ห้ามมีโค้ดอื่นคั่นระหว่าง createServerClient กับ getClaims()
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/login" && pathname !== "/") {
      url.searchParams.set("next", `${pathname}${search}`);
    }
    const redirect = NextResponse.redirect(url);
    // คัดลอก cookie ที่เพิ่งต่ออายุไปด้วย ไม่งั้นผู้ใช้จะหลุด login
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!isLoggedIn && !startsWithAny(pathname, PUBLIC_PATHS)) {
    return redirectTo("/login");
  }
  if (isLoggedIn && startsWithAny(pathname, GUEST_ONLY_PATHS)) {
    return redirectTo("/dashboard");
  }

  return response;
}
