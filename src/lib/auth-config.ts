const DEVELOPMENT_AUTH_SECRET = "development-only-secret-change-me";

export function getAuthSecret(env: NodeJS.ProcessEnv = process.env) {
  const value = env.AUTH_SECRET?.trim();
  if (env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters in production.");
  }
  return value || DEVELOPMENT_AUTH_SECRET;
}

export const SESSION_COOKIE = "mondesa_session";
export const SESSION_HOURS = 8;
export const SESSION_ISSUER = "mondesahealth";
export const SESSION_AUDIENCE = "mondesahealth-staff";
