import { createHash, randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { ApiError } from "./authorization";
import type { AssessmentStatus, SessionUser } from "./domain";

const REQUIRED_COLUMNS = ["full_name", "date_of_birth", "center_code", "assigned_worker_email", "primary_language", "guardian_name", "guardian_phone", "guardian_relationship", "emergency_contact_name", "emergency_contact_phone"] as const;
const OPTIONAL_COLUMNS = ["child_external_id", "gender", "milestone_slug", "assessment_status", "assessment_date", "assessment_notes"] as const;
const ALL_COLUMNS: Set<string> = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
const statuses = new Set<AssessmentStatus>(["MET", "IN_PROGRESS", "NEEDS_REVIEW", "NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"]);
const relationships = new Set(["MOTHER", "FATHER", "GRANDPARENT", "SIBLING", "OTHER"]);
const genders = new Set(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]);
const locales = new Set(["en", "hi", "mr"]);

type CsvRow = Record<string, string>;
type Assessment = { milestoneId: string; status: AssessmentStatus; assessedAt: Date; notes: string };
type ValidChild = { key: string; internalId: string | null; fullName: string; dateOfBirth: Date; gender: string; centerId: string; workerId: string; primaryLanguage: string; guardianName: string; guardianPhone: string; guardianRelationship: string; emergencyContactName: string; emergencyContactPhone: string; assessments: Assessment[] };
export type ImportPreview = { previewHash: string; totalRows: number; uniqueChildren: number; validChildren: number; assessmentRows: number; duplicateChildren: number; errors: Array<{ row: number; message: string }>; assignmentDistribution: Array<{ worker: string; children: number }>; assignmentPlan: { required: { children: number; workers: number; childrenPerWorker: number }; meetsPlan: boolean; message: string } };

export function parseCsv(source: string): CsvRow[] {
  const cells: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) { if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; } else if (char === '"') quoted = false; else cell += char; continue; }
    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(cell); cell = ""; continue; }
    if (char === "\n") { row.push(cell); cells.push(row); row = []; cell = ""; continue; }
    if (char !== "\r") cell += char;
  }
  if (quoted) throw new ApiError(400, "INVALID_CSV", "CSV contains an unclosed quoted value.");
  if (cell.length || row.length) { row.push(cell); cells.push(row); }
  const [rawHeaders, ...data] = cells.filter((line) => line.some((value) => value.trim()));
  if (!rawHeaders) throw new ApiError(400, "INVALID_CSV", "CSV must include a header row.");
  const headers = rawHeaders.map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new ApiError(400, "INVALID_CSV", "CSV headers must be unique and non-empty.");
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new ApiError(400, "INVALID_CSV", `CSV is missing required columns: ${missing.join(", ")}.`);
  const unknown = headers.filter((header) => !ALL_COLUMNS.has(header));
  if (unknown.length) throw new ApiError(400, "INVALID_CSV", `CSV contains unsupported columns: ${unknown.join(", ")}.`);
  if (data.length > 1_000) throw new ApiError(413, "TOO_MANY_ROWS", "A single import may contain at most 1,000 CSV rows.");
  return data.map((values, index) => ({ ...Object.fromEntries(headers.map((header, column) => [header, (values[column] ?? "").trim()])), __row: String(index + 2) }));
}

function parseDate(value: string, row: number, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is invalid.`);
  return parsed;
}
function profileKey(row: CsvRow) { return row.child_external_id ? `id:${row.child_external_id}` : `profile:${row.full_name}\u0000${row.date_of_birth}\u0000${row.center_code}`; }
function profileSignature(row: CsvRow) { return [row.full_name, row.date_of_birth, row.gender, row.center_code, row.assigned_worker_email.toLowerCase(), row.primary_language, row.guardian_name, row.guardian_phone, row.guardian_relationship, row.emergency_contact_name, row.emergency_contact_phone].join("\u0000"); }
export function meetsAssignmentPlan(distribution: Array<{ worker: string; children: number }>, children: number) { return children === 100 && distribution.length === 10 && distribution.every((row) => row.children === 10); }

export async function previewChildImport(csv: string): Promise<{ rows: CsvRow[]; children: ValidChild[]; preview: ImportPreview }> {
  const rows = parseCsv(csv);
  const [centers, workers, definitions, existingChildren] = await Promise.all([
    prisma.center.findMany({ where: { active: true }, select: { id: true, code: true } }),
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, select: { id: true, email: true, centerIds: true } }),
    prisma.milestoneDefinition.findMany({ where: { active: true }, select: { id: true, slug: true } }),
    prisma.child.findMany({ select: { internalId: true, fullName: true, dateOfBirth: true, centerId: true } }),
  ]);
  const centerByCode = new Map(centers.map((item) => [item.code, item]));
  const workerByEmail = new Map(workers.map((item) => [item.email.toLowerCase(), item]));
  const milestoneBySlug = new Map(definitions.map((item) => [item.slug, item]));
  const existingIds = new Set(existingChildren.map((item) => item.internalId));
  const existingProfiles = new Set(existingChildren.map((item) => `${item.fullName}\u0000${item.dateOfBirth.toISOString().slice(0, 10)}\u0000${item.centerId}`));
  const errors: ImportPreview["errors"] = []; const grouped = new Map<string, { row: CsvRow; signature: string; assessments: Assessment[]; profileRows: number; assessmentKeys: Set<string> }>();
  for (const row of rows) {
    try {
      for (const column of REQUIRED_COLUMNS) if (!row[column]) throw new Error(`${column} is required.`);
      if (row.full_name.length > 160 || row.guardian_name.length > 160 || row.guardian_phone.length > 32 || row.emergency_contact_name.length > 160 || row.emergency_contact_phone.length > 32) throw new Error("One or more profile values exceed the allowed length.");
      const rowNumber = Number(row.__row); const dob = parseDate(row.date_of_birth, rowNumber, "date_of_birth"); const now = new Date(); const oldest = new Date(now); oldest.setUTCFullYear(oldest.getUTCFullYear() - 6);
      if (dob > now || dob < oldest) throw new Error("date_of_birth must be within the supported 0–6 year range.");
      if (row.gender && !genders.has(row.gender)) throw new Error("gender must be FEMALE, MALE, OTHER, or UNSPECIFIED.");
      if (!locales.has(row.primary_language)) throw new Error("primary_language must be en, hi, or mr.");
      if (!relationships.has(row.guardian_relationship)) throw new Error("guardian_relationship is invalid.");
      if (row.child_external_id && !/^[A-Za-z0-9_-]{2,64}$/.test(row.child_external_id)) throw new Error("child_external_id must contain 2–64 letters, numbers, underscores, or hyphens.");
      const center = centerByCode.get(row.center_code); if (!center) throw new Error("center_code does not identify an active center.");
      const worker = workerByEmail.get(row.assigned_worker_email.toLowerCase()); if (!worker || !Array.isArray(worker.centerIds) || !worker.centerIds.includes(center.id)) throw new Error("assigned_worker_email is not an active worker assigned to this center.");
      const key = profileKey(row); const signature = profileSignature(row); const current = grouped.get(key);
      if (current && current.signature !== signature) throw new Error("Rows for the same child contain conflicting profile values.");
      if (row.child_external_id && existingIds.has(row.child_external_id)) throw new Error("A child with this approved identifier already exists.");
      if (existingProfiles.has(`${row.full_name}\u0000${row.date_of_birth}\u0000${center.id}`)) throw new Error("A child with this name, date of birth, and center already exists.");
      const hasAssessment = [row.milestone_slug, row.assessment_status, row.assessment_date, row.assessment_notes].some(Boolean);
      let assessment: Assessment | undefined;
      if (hasAssessment) {
        if (!row.milestone_slug || !row.assessment_status || !row.assessment_date) throw new Error("milestone_slug, assessment_status, and assessment_date are required together.");
        const milestone = milestoneBySlug.get(row.milestone_slug); if (!milestone) throw new Error("milestone_slug is not an active Balsathi milestone.");
        if (!statuses.has(row.assessment_status as AssessmentStatus)) throw new Error("assessment_status is invalid.");
        const assessedAt = parseDate(row.assessment_date, rowNumber, "assessment_date"); if (assessedAt > now || assessedAt < dob) throw new Error("assessment_date must be after birth and cannot be in the future.");
        assessment = { milestoneId: milestone.id, status: row.assessment_status as AssessmentStatus, assessedAt, notes: row.assessment_notes ?? "" };
      }
      if (!current) grouped.set(key, { row, signature, assessments: assessment ? [assessment] : [], profileRows: 1, assessmentKeys: assessment ? new Set([`${assessment.milestoneId}\u0000${assessment.assessedAt.toISOString()}\u0000${assessment.status}`]) : new Set() });
      else if (!assessment) {
        throw new Error("Duplicate child profile row; repeat a child only to provide an additional distinct assessment.");
      } else {
        const assessmentKey = `${assessment.milestoneId}\u0000${assessment.assessedAt.toISOString()}\u0000${assessment.status}`;
        if (current.assessmentKeys.has(assessmentKey)) throw new Error("Duplicate milestone assessment row for this child.");
        current.assessmentKeys.add(assessmentKey); current.assessments.push(assessment); current.profileRows += 1;
      }
    } catch (error) { errors.push({ row: Number(row.__row), message: error instanceof Error ? error.message : "Invalid row." }); }
  }
  const children: ValidChild[] = [...grouped.entries()].map(([key, item]) => {
    const center = centerByCode.get(item.row.center_code)!; const worker = workerByEmail.get(item.row.assigned_worker_email.toLowerCase())!;
    return { key, internalId: item.row.child_external_id || null, fullName: item.row.full_name, dateOfBirth: new Date(`${item.row.date_of_birth}T00:00:00.000Z`), gender: item.row.gender || "UNSPECIFIED", centerId: center.id, workerId: worker.id, primaryLanguage: item.row.primary_language, guardianName: item.row.guardian_name, guardianPhone: item.row.guardian_phone, guardianRelationship: item.row.guardian_relationship, emergencyContactName: item.row.emergency_contact_name, emergencyContactPhone: item.row.emergency_contact_phone, assessments: item.assessments };
  });
  const distribution = [...children.reduce((map, child) => map.set(child.workerId, (map.get(child.workerId) ?? 0) + 1), new Map<string, number>()).entries()].map(([worker, count]) => ({ worker, children: count })).sort((left, right) => left.worker.localeCompare(right.worker));
  const meetsPlan = meetsAssignmentPlan(distribution, children.length);
  const duplicateChildren = errors.filter((error) => error.message.includes("already exists")).length;
  return { rows, children, preview: { previewHash: createHash("sha256").update(csv).digest("hex"), totalRows: rows.length, uniqueChildren: children.length, validChildren: errors.length ? 0 : children.length, assessmentRows: children.reduce((sum, child) => sum + child.assessments.length, 0), duplicateChildren, errors: errors.slice(0, 100), assignmentDistribution: distribution, assignmentPlan: { required: { children: 100, workers: 10, childrenPerWorker: 10 }, meetsPlan, message: meetsPlan ? "The import contains exactly 100 children assigned evenly across 10 workers." : "This file does not meet the optional 100 children / 10 workers / 10 children each assignment plan." } } };
}

export async function commitChildImport(session: SessionUser, csv: string, expectedHash: string, enforceAssignmentPlan: boolean) {
  const result = await previewChildImport(csv);
  if (result.preview.previewHash !== expectedHash) throw new ApiError(409, "PREVIEW_CHANGED", "The file differs from the reviewed preview. Preview it again before importing.");
  if (result.preview.errors.length) throw new ApiError(422, "IMPORT_VALIDATION_FAILED", "The CSV has validation errors or duplicate records; nothing was imported.");
  if (enforceAssignmentPlan && !result.preview.assignmentPlan.meetsPlan) throw new ApiError(422, "ASSIGNMENT_PLAN_MISMATCH", result.preview.assignmentPlan.message);
  const imported = await prisma.$transaction(async (tx) => {
    let assessmentCount = 0;
    for (const child of result.children) {
      const id = randomUUID(); const internalId = child.internalId ?? `BAL-IMP-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      await tx.child.create({ data: { id, internalId, fullName: child.fullName, dateOfBirth: child.dateOfBirth, gender: child.gender, centerId: child.centerId, assignedWorkerId: child.workerId, primaryLanguage: child.primaryLanguage, emergencyContactName: child.emergencyContactName, emergencyContactPhone: child.emergencyContactPhone, siblingIds: [], guardianLinks: { create: { guardian: { create: { id: randomUUID(), name: child.guardianName, phone: child.guardianPhone, preferredLanguage: child.primaryLanguage, address: "" } }, relationship: child.guardianRelationship, isPrimary: true } }, assessments: { create: child.assessments.map((assessment) => ({ id: randomUUID(), milestoneId: assessment.milestoneId, assessedById: session.id, assessedAt: assessment.assessedAt, status: assessment.status, notes: assessment.notes })) } } });
      assessmentCount += child.assessments.length;
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: session.id, action: "child.imported", entityType: "Child", entityId: id, scopeCenterId: child.centerId, metadata: { import: true, assessmentCount: child.assessments.length } } });
    }
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: session.id, action: "child_import.committed", entityType: "ChildImport", entityId: result.preview.previewHash, metadata: { childCount: result.children.length, assessmentCount, enforceAssignmentPlan } } });
    return { importedChildren: result.children.length, importedAssessments: assessmentCount };
  }, { timeout: 20_000 });
  return { ...imported, assignmentPlan: result.preview.assignmentPlan };
}
