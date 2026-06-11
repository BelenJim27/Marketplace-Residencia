/**
 * Validaciones compartidas de los formularios de autenticación.
 * Fuente única de verdad para el frontend; las reglas de contraseña están
 * alineadas con el backend en `apps/api/src/modules/auth/dto/password.validator.ts`.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/** Formato permitido para `nombre_usuario`: alfanumérico + punto, guion y guion bajo. */
export const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

export function isValidUsername(username: string): boolean {
  const u = username.trim();
  return u.length >= 2 && u.length <= 50 && USERNAME_REGEX.test(u);
}

export interface PasswordCheck {
  label: string;
  fulfilled: boolean;
}

/**
 * Devuelve el checklist de reglas de contraseña con su estado de cumplimiento.
 * Si se pasa `email`, valida que la contraseña no contenga la parte local del correo.
 */
export function getPasswordChecks(password: string, email = ""): PasswordCheck[] {
  const p = password;
  const userPart = email.split("@")[0]?.toLowerCase() ?? "";

  return [
    { label: "Mínimo 8 caracteres", fulfilled: p.length >= 8 },
    { label: "Una letra mayúscula", fulfilled: /[A-Z]/.test(p) },
    { label: "Un símbolo especial", fulfilled: /[!@#$%^&*(),.?":{}|<>_]/.test(p) },
    { label: "Un número", fulfilled: /\d/.test(p) },
    {
      label: "Sin números consecutivos (ej. 12)",
      fulfilled:
        p.length > 0 &&
        !p.split("").some((char, i) => {
          const next = p[i + 1];
          return (
            /\d/.test(char) &&
            /\d/.test(next) &&
            Number(next) === Number(char) + 1
          );
        }),
    },
    {
      label: "No debe contener tu usuario",
      fulfilled: userPart.length > 0 ? !p.toLowerCase().includes(userPart) : p.length > 0,
    },
  ];
}

export function isStrongPassword(password: string, email = ""): boolean {
  return getPasswordChecks(password, email).every((check) => check.fulfilled);
}
