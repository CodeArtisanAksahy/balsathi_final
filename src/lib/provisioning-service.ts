import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { appLocales, guardianRelationships } from "./domain";
import { ApiError } from "./authorization";
import { prisma } from "./prisma";
import type { SessionUser } from "./domain";

const name = z.string().trim().min(2).max(120);
const phone = z.string().trim().min(7).max(20);
const childLinksSchema = z.array(z.object({ childId: z.string().min(1), relationship: z.enum(guardianRelationships) })).min(1).max(20);

export const createUserSchema = z.object({
  name,
  email: z.email().transform((value) => value.trim().toLowerCase()),
  phone,
  role: z.enum(["WORKER", "PARENT", "CENTER_ADMIN"]),
  preferredLanguage: z.enum(appLocales).default("en"),
  centerIds: z.array(z.string().min(1).max(80)).max(20).default([]),
  password: z.string().min(12).max(128),
  guardianLinks: childLinksSchema.optional(),
});

export const updateUserSchema = z.object({
  name: name.optional(),
  phone: phone.optional(),
  role: z.enum(["WORKER", "PARENT", "CENTER_ADMIN"]).optional(),
  preferredLanguage: z.enum(appLocales).optional(),
  centerIds: z.array(z.string().min(1).max(80)).max(20).optional(),
  active: z.boolean().optional(),
  password: z.string().min(12).max(128).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const createCenterSchema = z.object({
  code: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/).transform((value) => value.toUpperCase()),
  name,
  village: name,
  district: name,
  state: name,
});

export const updateCenterSchema = z.object({ name: name.optional(), village: name.optional(), district: name.optional(), state: name.optional(), active: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export function requireProvisioningRole(actor: SessionUser, role?: string) {
  if (actor.role !== "DISTRICT_ADMIN" && actor.role !== "CENTER_ADMIN") throw new ApiError(403, "FORBIDDEN", "Your role cannot manage organization accounts.");
  if (role === "DISTRICT_ADMIN") throw new ApiError(403, "ROLE_ESCALATION_DENIED", "District administrator accounts require a separate controlled process.");
}

function requireDistrictAdmin(actor: SessionUser) {
  if (actor.role !== "DISTRICT_ADMIN") throw new ApiError(403, "FORBIDDEN", "Only a district administrator can manage centers or administrator accounts.");
}

async function assertCenterAssignments(actor: SessionUser, role: string, centerIds: string[]) {
  if (role === "PARENT") {
    if (centerIds.length) throw new ApiError(422, "INVALID_CENTER_ASSIGNMENT", "Parent accounts do not receive staff center assignments.");
    return;
  }
  if (!centerIds.length || new Set(centerIds).size !== centerIds.length) throw new ApiError(422, "INVALID_CENTER_ASSIGNMENT", "Choose one or more distinct centers for staff accounts.");
  if (actor.role !== "DISTRICT_ADMIN" && centerIds.some((id) => !actor.centerIds.includes(id))) throw new ApiError(403, "CENTER_FORBIDDEN", "A center administrator cannot assign accounts outside their centers.");
  const centers = await prisma.center.findMany({ where: { id: { in: centerIds }, active: true }, select: { id: true } });
  if (centers.length !== centerIds.length) throw new ApiError(422, "INVALID_CENTER", "One or more selected centers are unavailable.");
}

function visibleUserWhere(actor: SessionUser) {
  if (actor.role === "DISTRICT_ADMIN") return {};
  if (actor.role !== "CENTER_ADMIN") throw new ApiError(403, "FORBIDDEN", "Your role cannot view organization accounts.");
  return { role: { in: ["WORKER", "PARENT"] } };
}

export async function listProvisionedUsers(actor: SessionUser) {
  const rows = await prisma.user.findMany({ where: visibleUserWhere(actor), orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, phone: true, preferredLanguage: true, centerIds: true, active: true, createdAt: true, updatedAt: true, guardians: { select: { childLinks: { select: { child: { select: { centerId: true } } } } } } } });
  const visible = actor.role === "DISTRICT_ADMIN" ? rows : rows.filter((row) => row.role === "PARENT"
    ? row.guardians.some((guardian) => guardian.childLinks.some((link) => actor.centerIds.includes(link.child.centerId)))
    : Array.isArray(row.centerIds) && row.centerIds.some((id) => typeof id === "string" && actor.centerIds.includes(id)));
  return visible.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role, phone: row.phone, preferredLanguage: row.preferredLanguage, centerIds: Array.isArray(row.centerIds) ? row.centerIds.filter((id): id is string => typeof id === "string") : [], active: row.active, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function createProvisionedUser(actor: SessionUser, input: z.infer<typeof createUserSchema>) {
  requireProvisioningRole(actor, input.role);
  if (actor.role === "CENTER_ADMIN" && input.role === "CENTER_ADMIN") throw new ApiError(403, "ROLE_ESCALATION_DENIED", "Center administrators cannot create administrators.");
  await assertCenterAssignments(actor, input.role, input.centerIds);
  if (input.role === "PARENT" && !input.guardianLinks?.length) throw new ApiError(422, "GUARDIAN_LINK_REQUIRED", "A parent account must be linked to at least one verified child guardian record.");
  if (input.role !== "PARENT" && input.guardianLinks?.length) throw new ApiError(422, "INVALID_GUARDIAN_LINK", "Only parent accounts can be linked to children.");
  const existingEmails = await prisma.user.findMany({ select: { email: true } });
  if (existingEmails.some((user) => user.email.trim().toLowerCase() === input.email)) throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists.");
  const links = input.guardianLinks ?? [];
  if (links.length && new Set(links.map((link) => link.childId)).size !== links.length) throw new ApiError(422, "DUPLICATE_GUARDIAN_LINK", "Each child can appear only once in this request.");
  const scopedChildren = links.length ? await prisma.child.findMany({
    where: { id: { in: links.map((link) => link.childId) }, active: true },
    include: { guardianLinks: { include: { guardian: true } } },
  }) : [];
  if (scopedChildren.length !== links.length) throw new ApiError(404, "CHILD_NOT_FOUND", "One or more children are unavailable.");
  if (actor.role !== "DISTRICT_ADMIN" && scopedChildren.some((child) => !actor.centerIds.includes(child.centerId))) throw new ApiError(403, "CENTER_FORBIDDEN", "A parent link targets a child outside your centers.");
  for (const link of links) {
    const child = scopedChildren.find((row) => row.id === link.childId)!;
    const available = child.guardianLinks.some(({ relationship, guardian }) => relationship === link.relationship && guardian.phone === input.phone && guardian.name.trim().toLocaleLowerCase() === input.name.trim().toLocaleLowerCase() && !guardian.linkedUserId);
    if (!available) throw new ApiError(422, "GUARDIAN_VERIFICATION_FAILED", "The child's registered guardian name/phone/relationship does not match this parent account.");
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { id, name: input.name, email: input.email, role: input.role, phone: input.phone, preferredLanguage: input.preferredLanguage, centerIds: input.centerIds, passwordHash }, select: { id: true, name: true, email: true, role: true, phone: true, preferredLanguage: true, centerIds: true, active: true, createdAt: true } });
      if (input.role === "PARENT") {
        for (const link of links) {
          const child = scopedChildren.find((row) => row.id === link.childId)!;
          const guardian = child.guardianLinks.find((row) => row.relationship === link.relationship && row.guardian.phone === input.phone && row.guardian.name.trim().toLocaleLowerCase() === input.name.trim().toLocaleLowerCase() && !row.guardian.linkedUserId)!;
          const linked = await tx.guardian.updateMany({ where: { id: guardian.guardianId, linkedUserId: null }, data: { linkedUserId: user.id } });
          if (linked.count !== 1) throw new ApiError(409, "GUARDIAN_ALREADY_LINKED", "This guardian was linked to an account by another request.");
        }
      }
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: actor.id, action: "user.created", entityType: "User", entityId: id, scopeCenterId: input.centerIds[0] ?? scopedChildren[0]?.centerId ?? null, metadata: { role: input.role, centerIds: input.centerIds, guardianChildIds: links.map((link) => link.childId) } } });
      return user;
    });
    return created;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists.");
    throw error;
  }
}

export async function updateProvisionedUser(actor: SessionUser, userId: string, input: z.infer<typeof updateUserSchema>) {
  requireProvisioningRole(actor, input.role);
  if (userId === actor.id && (input.active === false || input.role)) throw new ApiError(422, "SELF_LOCKOUT_DENIED", "You cannot deactivate your own account or change your own role.");
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, centerIds: true, guardians: { select: { childLinks: { select: { child: { select: { centerId: true } } } } } } },
  });
  if (!current || current.role === "DISTRICT_ADMIN") throw new ApiError(404, "USER_NOT_FOUND", "Account not found.");
  if (actor.role === "CENTER_ADMIN") {
    if (!(["WORKER", "PARENT"].includes(current.role))) throw new ApiError(403, "FORBIDDEN", "You cannot manage this account.");
    const assigned = Array.isArray(current.centerIds) ? current.centerIds.filter((id): id is string => typeof id === "string") : [];
    const parentScoped = current.guardians.some((guardian) => guardian.childLinks.some((link) => actor.centerIds.includes(link.child.centerId)));
    if (current.role === "PARENT" ? !parentScoped : !assigned.some((id) => actor.centerIds.includes(id))) throw new ApiError(403, "CENTER_FORBIDDEN", "This account is outside your centers.");
    if (input.role === "CENTER_ADMIN") throw new ApiError(403, "ROLE_ESCALATION_DENIED", "Center administrators cannot promote accounts to administrator.");
    if (input.centerIds?.some((id) => !actor.centerIds.includes(id))) throw new ApiError(403, "CENTER_FORBIDDEN", "A center administrator cannot assign accounts outside their centers.");
  }
  const role = input.role ?? current.role;
  const centerIds = input.centerIds ?? (Array.isArray(current.centerIds) ? current.centerIds.filter((id): id is string => typeof id === "string") : []);
  await assertCenterAssignments(actor, role, centerIds);
  if (role === "PARENT" && input.centerIds?.length) throw new ApiError(422, "INVALID_CENTER_ASSIGNMENT", "Parent accounts do not receive staff center assignments.");
  if (role === "PARENT" && current.role !== "PARENT") {
    const hasGuardianLink = current.guardians.some((guardian) => guardian.childLinks.some((link) => actor.role === "DISTRICT_ADMIN" || actor.centerIds.includes(link.child.centerId)));
    if (!hasGuardianLink) throw new ApiError(422, "GUARDIAN_LINK_REQUIRED", "A parent account must be linked to a verified child guardian record.");
  }
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  const saved = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { ...(input.name ? { name: input.name } : {}), ...(input.phone ? { phone: input.phone } : {}), ...(input.role ? { role: input.role } : {}), ...(input.preferredLanguage ? { preferredLanguage: input.preferredLanguage } : {}), ...(input.active === undefined ? {} : { active: input.active }), centerIds, ...(passwordHash ? { passwordHash } : {}) }, select: { id: true, name: true, email: true, role: true, phone: true, preferredLanguage: true, centerIds: true, active: true, createdAt: true, updatedAt: true } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: actor.id, action: input.active === false ? "user.deactivated" : input.active === true ? "user.activated" : "user.updated", entityType: "User", entityId: userId, scopeCenterId: centerIds[0] ?? null, metadata: { fields: Object.keys(input) } } });
    if (input.active === false || input.role || input.password) await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return user;
  });
  return saved;
}

export async function listProvisionedCenters(actor: SessionUser) {
  if (actor.role !== "DISTRICT_ADMIN" && actor.role !== "CENTER_ADMIN") throw new ApiError(403, "FORBIDDEN", "Your role cannot view center administration.");
  const rows = await prisma.center.findMany({ where: actor.role === "DISTRICT_ADMIN" ? {} : { id: { in: actor.centerIds } }, orderBy: [{ district: "asc" }, { name: "asc" }] });
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function createProvisionedCenter(actor: SessionUser, input: z.infer<typeof createCenterSchema>) {
  requireDistrictAdmin(actor);
  try {
    return await prisma.$transaction(async (tx) => {
      const center = await tx.center.create({ data: { id: randomUUID(), ...input } });
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: actor.id, action: "center.created", entityType: "Center", entityId: center.id, scopeCenterId: center.id, metadata: { code: center.code } } });
      return center;
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new ApiError(409, "CENTER_CODE_EXISTS", "A center with this code already exists.");
    throw error;
  }
}

export async function updateProvisionedCenter(actor: SessionUser, centerId: string, input: z.infer<typeof updateCenterSchema>) {
  requireDistrictAdmin(actor);
  const current = await prisma.center.findUnique({ where: { id: centerId }, select: { id: true } });
  if (!current) throw new ApiError(404, "CENTER_NOT_FOUND", "Center not found.");
  return prisma.$transaction(async (tx) => {
    if (input.active === false) {
      const activeChildren = await tx.child.count({ where: { centerId, active: true } });
      if (activeChildren > 0) throw new ApiError(409, "ACTIVE_CHILDREN_REMAIN", "Archive or transfer active children before deactivating this center.");
    }
    const center = await tx.center.update({ where: { id: centerId }, data: input });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: actor.id, action: input.active === false ? "center.deactivated" : input.active === true ? "center.activated" : "center.updated", entityType: "Center", entityId: centerId, scopeCenterId: centerId, metadata: { fields: Object.keys(input) } } });
    if (input.active === false) {
      const staff = await tx.user.findMany({ where: { active: true, role: { in: ["WORKER", "CENTER_ADMIN"] } }, select: { id: true, centerIds: true } });
      const affected = staff.filter((user) => Array.isArray(user.centerIds) && user.centerIds.includes(centerId));
      for (const user of affected) {
        const remainingCenterIds = (user.centerIds as string[]).filter((assignedId) => assignedId !== centerId);
        await tx.user.update({ where: { id: user.id }, data: { centerIds: remainingCenterIds, ...(remainingCenterIds.length ? {} : { active: false }) } });
        await tx.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { id: randomUUID(), actorId: actor.id, action: "user.center_access_removed", entityType: "User", entityId: user.id, scopeCenterId: centerId, metadata: { remainingCenterIds, deactivated: remainingCenterIds.length === 0 } } });
      }
    }
    return center;
  });
}
