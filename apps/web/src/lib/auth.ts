import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in",
    callbackUrl: "/Cliente/producto",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Si la URL es relativa, la convertimos a absoluta
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Si la URL es del mismo origen, la permitimos
      else if (new URL(url).origin === baseUrl) return url;
      // Si no, redirigimos al dashboard
      return `${baseUrl}/Cliente/producto`;
    },
  },
};
