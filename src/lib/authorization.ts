import { getSession } from "./auth";
import type { AppRole, SessionUser } from "./domain";

export type Permission =
  | "children:read"
  | "children:create"
  | "children:update"
  | "observations:read"
  | "observations:create"
  | "observations:update"
  | "followups:read"
  | "followups:update"
  | "milestones:read"
  | "milestones:create"
  | "messages:read"
  | "messages:create"
  | "reports:read"
  | "reports:create"
  | "admin:read"
  | "admin:write";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const permissions: Record<AppRole, readonly Permission[]> = {
  WORKER: [
    "children:read",
    "children:create",
    "observations:read",
    "observations:create",
    "observations:update",
    "followups:read",
    "followups:update",
    "milestones:read",
    "milestones:create",
    "messages:read",
    "messages:create",
    "reports:read",
    "reports:create",
  ],
  PARENT: ["children:read", "observations:read", "milestones:read", "messages:read", "messages:create", "reports:read"],
  CENTER_ADMIN: [
    "children:read",
    "children:create",
    "children:update",
    "observations:read",
    "observations:create",
    "observations:update",
    "followups:read",
    "followups:update",
    "milestones:read",
    "milestones:create",
    "messages:read",
    "messages:create",
    "reports:read",
    "reports:create",
    "admin:read",
  ],
  DISTRICT_ADMIN: [
    "children:read",
    "children:create",
    "children:update",
    "observations:read",
    "observations:create",
    "observations:update",
    "followups:read",
    "followups:update",
    "milestones:read",
    "milestones:create",
    "messages:read",
    "messages:create",
    "reports:read",
    "reports:create",
    "admin:read",
    "admin:write",
  ],
};

export async function getActorFromSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  return session;
}

export function requirePermission(role: AppRole, permission: Permission): void {
  if (!permissions[role]?.includes(permission)) {
    throw new ApiError(403, "FORBIDDEN", "Your role cannot perform this action.");
  }
}

export function canAccessCenter(session: SessionUser, centerId: string): boolean {
  if (session.role === "DISTRICT_ADMIN") return true;
  return session.centerIds.includes(centerId);
}

export function requireCenterAccess(session: SessionUser, centerId: string): void {
  if (!canAccessCenter(session, centerId)) {
    throw new ApiError(403, "CENTER_FORBIDDEN", "This center is outside your assigned scope.");
  }
}

/** Enforce child scope against database child records, including explicit parent links. */
export async function requireDatabaseChildAccess(session: SessionUser, childId: string) {
  const { prisma } = await import("./prisma");
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      active: true,
      ...(session.role === "DISTRICT_ADMIN" ? {} : session.role === "PARENT"
        ? { guardianLinks: { some: { guardian: { linkedUserId: session.id } } } }
        : session.role === "WORKER"
          ? { OR: [{ assignedWorkerId: session.id }, { centerId: { in: session.centerIds } }] }
          : { centerId: { in: session.centerIds } }),
    },
  });
  if (!child) throw new ApiError(404, "CHILD_NOT_FOUND", "Child record not found.");
  return child;
}
