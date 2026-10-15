import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDemoStore } from "./demo-store";
import { assertSecureAuthConfiguration, config, isPostgresMode } from "./config";
import type { AppLocale, SessionUser, User } from "./domain";

const encoder = new TextEncoder();
const SESSION_COOKIE = config.sessionCookie;

function secretKey(): Uint8Array {
  assertSecureAuthConfiguration();
  return encoder.encode(config.authSecret);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(user: User): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    centerIds: user.centerIds,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${config.sessionTtlHours}h`)
    .sign(secretKey());
}

export async function persistSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
    maxAge: 60 * 60 * config.sessionTtlHours,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await jwtVerify(token, secretKey());
    const id = payload.payload.sub ?? "";
    const role = payload.payload.role as SessionUser["role"];
    if (!id || !["WORKER", "PARENT", "CENTER_ADMIN", "DISTRICT_ADMIN"].includes(role)) return null;

    // In PostgreSQL mode, JWT claims are only an identity pointer. Reload active
    // authorization attributes so deactivation and scope changes take effect now.
    if (isPostgresMode()) {
      const { prisma } = await import("./prisma");
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user?.active) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        centerIds: user.centerIds,
      };
    }
    return {
      id,
      name: String(payload.payload.name ?? ""),
      email: String(payload.payload.email ?? ""),
      role,
      preferredLanguage: payload.payload.preferredLanguage as AppLocale,
      centerIds: Array.isArray(payload.payload.centerIds) ? payload.payload.centerIds.map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export function getDemoUserByEmail(email: string): User | undefined {
  return getDemoStore().users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function hasRoleAccess(session: SessionUser, rolePath: string): boolean {
  if (rolePath === "worker") return session.role === "WORKER";
  if (rolePath === "parent") return session.role === "PARENT";
  return session.role === "CENTER_ADMIN" || session.role === "DISTRICT_ADMIN";
}
