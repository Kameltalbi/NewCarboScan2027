export const PASSWORD_MIN = 8;

export const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,200}$/;

export const PASSWORD_POLICY_MESSAGE =
  "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un symbole.";

export function isStrongPassword(password: string): boolean {
  return passwordComplexityRegex.test(password);
}
