import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// Returns the current backend access token from the server-side NextAuth session.
// Used as fallback when client-side session/cookies are missing.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | undefined;
  const refreshToken = (session as any).refreshToken as string | undefined;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ error: "No backend tokens" }, { status: 404 });
  }

  // If we have a refresh token, try to get a fresh access token
  if (refreshToken && !accessToken) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          access_token: data.tokens.access_token,
          refresh_token: data.tokens.refresh_token,
        });
      }
    } catch {}
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
  }

  return NextResponse.json({ access_token: accessToken, refresh_token: refreshToken });
}
