import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    "/",
    "/comecar/:path*",
    "/saldos/:path*",
    "/totais/:path*",
    "/horizonte/:path*",
    "/menu/:path*",
    "/calendario/:path*",
    "/calendar/:path*",
    "/tags/:path*",
    "/categories/:path*",
    "/gastos-fixos/:path*",
    "/recorrentes/:path*",
    "/recurring/:path*",
    "/login",
    "/register",
  ],
};
