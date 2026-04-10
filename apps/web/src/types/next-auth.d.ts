import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      provider?: string;
    } & DefaultSession["user"];
    accessToken?: string;
    refreshToken?: string;
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    providerAccountId?: string;
    accessToken?: string;
    refreshToken?: string;
    id?: string;
  }
}
