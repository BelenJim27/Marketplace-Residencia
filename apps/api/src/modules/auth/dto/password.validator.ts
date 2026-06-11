/**
 * Reglas de contraseña fuerte (defensa en profundidad).
 * Alineadas con la validación del frontend en `apps/web/src/shared/validation/auth.ts`:
 *  - mínimo 8 caracteres
 *  - al menos una minúscula
 *  - al menos una mayúscula
 *  - al menos un número
 *  - al menos un símbolo (carácter no alfanumérico)
 */
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const STRONG_PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir mayúscula, minúscula, número y un símbolo';

/**
 * Formato permitido para `nombre_usuario`: alfanumérico más punto, guion y guion bajo.
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

export const USERNAME_MESSAGE =
  'El nombre de usuario solo puede contener letras, números, punto, guion y guion bajo';
