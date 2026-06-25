import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const backendPort = process.env.BACKEND_PORT || process.env.NEXT_PUBLIC_BACKEND_PORT || "8084";
const backendOrigin = `http://127.0.0.1:${backendPort}`;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = new URL(`${pathname}${search}`, backendOrigin);
  return NextResponse.rewrite(target);
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
