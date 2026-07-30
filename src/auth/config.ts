/**
 * NextAuth is retained for `/api/auth/*` compatibility.
 * Primary login uses opaque `hakeem.sid` cookies via `loginAction` + `auth()` in session-auth.ts (FR-015).
 *
 * MFA extension seam (FR-027): `runMfaExtensionSeam` in `src/auth/mfa.ts` runs after
 * credentials succeed and before `setSessionCookie()`. Set AUTH_MFA_ENFORCE=true and
 * enable MfaFactor rows to require a challenge (TOTP planned).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { requireAuthSecret } from "@/lib/env";

export const { handlers, signIn, signOut: nextAuthSignOut } = NextAuth({
  secret: requireAuthSecret(),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize() {
        // Disabled — use loginAction for opaque DB sessions.
        return null;
      },
    }),
  ],
});
