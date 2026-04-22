import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const apiBaseUrl = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "")}`;

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Account linking is handled by the backend (oauth.service.ts upsertOAuthAccount)
      // which safely links to an existing email without requiring confirmation
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
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
          const response = await fetch(`${apiBaseUrl}/auth/login`, {
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
            id_usuario: String(data.user.id_usuario),
            email: data.user.email,
            name: data.user.nombre,
            image: data.user.foto_url,
            nombre: data.user.nombre,
            apellido_paterno: data.user.apellido_paterno,
            apellido_materno: data.user.apellido_materno,
            telefono: data.user.telefono,
            biografia: data.user.biografia,
            foto_url: data.user.foto_url,
            idioma_preferido: data.user.idioma_preferido,
            moneda_preferida: data.user.moneda_preferida,
            roles: data.user.roles,
            permisos: data.user.permisos,
            id_productor: data.user.id_productor,
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
    maxAge: 30 * 24 * 60 * 60, // 30 días, igual que el refresh token
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return `${baseUrl}/auth/sign-in`;
    },
    async signIn() {
      return true;
    },
    async jwt({ token, user, account }: any) {
      if (account && account.provider === "google") {
        try {
          const response = await fetch(`${apiBaseUrl}/auth/oauth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              provider_uid: user.id,
              email: user.email,
              nombre: user.name,
              fotoUrl: user.image,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            token.accessToken = data.tokens.access_token;
            token.refreshToken = data.tokens.refresh_token;
            token.id = data.user.id_usuario;
            token.id_usuario = data.user.id_usuario;
            token.email = user.email;
            token.name = user.name;
            token.picture = data.user.foto_url || user.image;
            token.nombre = data.user.nombre;
            token.apellido_paterno = data.user.apellido_paterno;
            token.apellido_materno = data.user.apellido_materno;
            token.telefono = data.user.telefono;
            token.biografia = data.user.biografia;
            token.foto_url = data.user.foto_url;
            token.idioma_preferido = data.user.idioma_preferido;
            token.moneda_preferida = data.user.moneda_preferida;
            token.roles = data.user.roles;
            token.permisos = data.user.permisos;
            token.id_productor = data.user.id_productor;
            return token;
          }

          console.error("[Auth] oauth/google backend error:", response.status);
          token.email = user.email;
          token.name = user.name;
          token.id = user.id;
          token.picture = user.image;
          return token;
        } catch (err) {
          console.error("[Auth] jwt callback error:", err);
          token.email = user.email;
          token.name = user.name;
          token.id = user.id;
          token.picture = user.image;
          return token;
        }
      }
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.id = user.id;
        token.id_usuario = user.id_usuario || user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.foto_url || user.image;
        token.nombre = user.nombre || user.name;
        token.apellido_paterno = user.apellido_paterno;
        token.apellido_materno = user.apellido_materno;
        token.telefono = user.telefono;
        token.biografia = user.biografia;
        token.foto_url = user.foto_url;
        token.idioma_preferido = user.idioma_preferido;
        token.moneda_preferida = user.moneda_preferida;
        token.roles = user.roles;
        token.permisos = user.permisos;
        token.id_productor = user.id_productor;
        return token;
      }

      const now = Math.floor(Date.now() / 1000);
      if (!token.exp || token.exp - now > 60) {
        return token;
      }

      if (!token.refreshToken) {
        return token;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refresh_token: token.refreshToken,
          }),
        });

        if (!response.ok) {
          return token;
        }

        const data = await response.json();
        token.accessToken = data.tokens.access_token;
        token.refreshToken = data.tokens.refresh_token;
      } catch (err) {
        console.error("Error refreshing token:", err);
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.user.id = token.id || token.sub;
        session.user.id_usuario = token.id_usuario || token.id || token.sub;
        session.user.email = token.email;
        session.user.name = token.nombre || token.name;
        session.user.image = token.foto_url || token.picture || null;
        session.user.nombre = token.nombre || token.name;
        session.user.apellido_paterno = token.apellido_paterno;
        session.user.apellido_materno = token.apellido_materno;
        session.user.telefono = token.telefono;
        session.user.biografia = token.biografia;
        session.user.foto_url = token.foto_url || token.picture || null;
        session.user.idioma_preferido = token.idioma_preferido;
        session.user.moneda_preferida = token.moneda_preferida;
        session.user.roles = token.roles;
        session.user.permisos = token.permisos;
        session.user.id_productor = token.id_productor;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in?error=auth_error",
  },
};
