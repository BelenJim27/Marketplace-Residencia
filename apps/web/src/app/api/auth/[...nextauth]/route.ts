import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        console.log("📦 Google profile:", profile.email);
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          return {
            id: String(data.user.id_usuario),
            email: data.user.email,
            name: data.user.nombre,
            image: data.user.foto_url,
            accessToken: data.tokens.access_token,
            refreshToken: data.tokens.refresh_token,
          };
        } catch (err) {
          console.error("Error in credentials authorize:", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      console.log("✅ signIn callback", { 
        provider: account?.provider, 
        email: user?.email 
      });
      return true;
    },
    async jwt({ token, user, account }: any) {
      console.log("✅ jwt callback", { 
        provider: account?.provider, 
        hasUser: !!user,
        hasToken: !!token
      });
      
      if (account && account.provider === "google") {
        console.log("🔵 Processing Google OAuth...");
        try {
          // Llamar al backend para registrar/autenticar el usuario de Google
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/oauth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              email: user.email,
              nombre: user.name,
              fotoUrl: user.image,
            }),
          });

          console.log("📊 Backend response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("✅ Backend OAuth response:", { 
              hasTokens: !!data.tokens,
              userId: data.user?.id_usuario
            });
            
            token.accessToken = data.tokens.access_token;
            token.refreshToken = data.tokens.refresh_token;
            token.id = data.user.id_usuario;
            token.email = user.email;
            token.name = user.name;
            
            console.log("✅ Token actualizado con datos de backend");
            return token;
          } else {
            console.warn("⚠️ Backend auth/oauth/google retornó error:", response.status);
            // Aún así, crear el token con la información de Google
            token.email = user.email;
            token.name = user.name;
            token.id = user.id;
            return token;
          }
        } catch (err) {
          console.error("❌ Error en jwt callback:", err);
          // Crear token básico incluso si falla el backend
          token.email = user.email;
          token.name = user.name;
          token.id = user.id;
          return token;
        }
      }
      
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      
      return token;
    },
    async session({ session, token }: any) {
      console.log("📋 session callback", { 
        hasToken: !!token,
        hasAccessToken: !!token?.accessToken 
      });
      
      if (token) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.user.id = token.id || token.sub;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      
      console.log("✅ Session retornada:", { 
        hasEmail: !!session.user.email,
        hasId: !!session.user.id
      });
      
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in?error=auth_error",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
