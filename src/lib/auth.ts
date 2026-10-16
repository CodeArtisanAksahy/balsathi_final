import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDemoStore } from "./demo-store";
import { assertSecureAuthConfiguration, config } from "./config";
import type { AppLocale, SessionUser, User } from "./domain";
import { appLocales, appRoles } from "./domain";

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
  const jti = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((issuedAt + config.sessionTtlHours * 60 * 60) * 1000);
  if (config.dataMode === "sqlite") {
    const { prisma } = await import("./prisma");
    await prisma.$transaction([
      prisma.authSession.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
      prisma.authSession.create({ data: { id: jti, userId: user.id, expiresAt } }),
    ]);
  }
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    centerIds: user.centerIds,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setSubject(user.id)
    .setIssuedAt(issuedAt)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
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
  try { await revokeCurrentSession(); }
  finally {
    store.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      path: "/",
      maxAge: 0,
    });
  }
}

export async function revokeCurrentSession(): Promise<void> {
  if (config.dataMode !== "sqlite") return;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.jti) return;
    const { prisma } = await import("./prisma");
    await prisma.authSession.updateMany({ where: { id: String(payload.jti), userId: payload.sub, revokedAt: null }, data: { revokedAt: new Date() } });
  } catch {
    // Expired or invalid cookies are simply cleared at logout.
  }
}

export async function revokeUserSessions(userId: string): Promise<void> {
  if (config.dataMode !== "sqlite") return;
  const { prisma } = await import("./prisma");
  await prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
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

    // In SQLite mode, JWT claims are only an identity pointer. Reload active
    // authorization attributes so deactivation and scope changes take effect now.
    if (config.dataMode === "sqlite") {
      const { prisma } = await import("./prisma");
      const jti = payload.payload.jti;
      if (typeof jti !== "string") return null;
      const [user, session] = await Promise.all([
        prisma.user.findUnique({ where: { id } }),
        prisma.authSession.findUnique({ where: { id: jti } }),
      ]);
      if (!session || session.userId !== id || session.revokedAt || session.expiresAt <= new Date()) return null;
      if (!user?.active || !appRoles.includes(user.role as SessionUser["role"]) || !appLocales.includes(user.preferredLanguage as AppLocale)) return null;
      const assignedCenterIds = Array.isArray(user.centerIds) && user.centerIds.every((centerId) => typeof centerId === "string") ? user.centerIds as string[] : [];
      const activeCenters = assignedCenterIds.length ? await prisma.center.findMany({ where: { id: { in: assignedCenterIds }, active: true }, select: { id: true } }) : [];
      const centerIds = activeCenters.map((center) => center.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as SessionUser["role"],
        preferredLanguage: user.preferredLanguage as AppLocale,
        centerIds,
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
