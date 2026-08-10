import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/",
    "/calendar/:path*",
    "/categories/:path*",
    "/recurring/:path*",
    "/login",
    "/register",
  ],
};
