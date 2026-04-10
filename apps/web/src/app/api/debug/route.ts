export async function GET() {
  return Response.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Not set",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Not set",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
