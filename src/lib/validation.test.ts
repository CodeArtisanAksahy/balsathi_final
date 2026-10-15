import { describe, expect, it } from "vitest";
import { calendarDateSchema, childCreateSchema } from "./validation";

describe("calendar date validation", () => {
  it("accepts real calendar dates and rejects impossible dates", () => {
    expect(calendarDateSchema.safeParse("2024-02-29").success).toBe(true);
    expect(calendarDateSchema.safeParse("2023-02-29").success).toBe(false);
    expect(calendarDateSchema.safeParse("2024-13-01").success).toBe(false);
  });

  it("rejects impossible dates in child registrations", () => {
    const parsed = childCreateSchema.safeParse({
      fullName: "Test Child", dateOfBirth: "2024-02-31", gender: "FEMALE", centerId: "center",
      assignedWorkerId: "worker", primaryLanguage: "en", emergencyContactName: "Test Parent",
      emergencyContactPhone: "1234567890", guardian: { name: "Test Parent", phone: "1234567890", preferredLanguage: "en", relationship: "MOTHER" },
    });
    expect(parsed.success).toBe(false);
  });
});
