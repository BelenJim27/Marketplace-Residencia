import { NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(es|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ],
};
