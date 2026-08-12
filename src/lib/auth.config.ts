import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isAuthRoute =
        pathname.startsWith("/login") || pathname.startsWith("/register");

      if (!isLoggedIn && !isAuthRoute && pathname !== "/") {
        return false;
      }

      if (isLoggedIn && (isAuthRoute || pathname === "/")) {
        return Response.redirect(new URL("/totais", request.nextUrl));
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
