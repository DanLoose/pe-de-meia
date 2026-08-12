import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/",
    "/saldos/:path*",
    "/totais/:path*",
    "/horizonte/:path*",
    "/menu/:path*",
    "/calendario/:path*",
    "/calendar/:path*",
    "/tags/:path*",
    "/categories/:path*",
    "/recorrentes/:path*",
    "/recurring/:path*",
    "/login",
    "/register",
  ],
};
