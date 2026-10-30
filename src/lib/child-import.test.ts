import { describe, expect, it } from "vitest";
import { meetsAssignmentPlan, parseCsv } from "./child-import";

const header = "full_name,date_of_birth,center_code,assigned_worker_email,primary_language,guardian_name,guardian_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone";
describe("authorized child CSV parsing", () => {
  it("parses quoted fields and assigns source row numbers", () => {
    const rows = parseCsv(`${header}\n\"Asha, Kumari\",2023-01-02,C1,worker@example.test,en,Parent,9000000000,MOTHER,Contact,9000000001\n`);
    expect(rows).toHaveLength(1); expect(rows[0].full_name).toBe("Asha, Kumari"); expect(rows[0].__row).toBe("2");
  });
  it("rejects missing required headers", () => expect(() => parseCsv("full_name\nAsha\n")).toThrow("missing required columns"));
  it("rejects unsupported headers", () => expect(() => parseCsv(`${header},unapproved_score\nAsha,2023-01-02,C1,worker@example.test,en,Parent,9000000000,MOTHER,Contact,9000000001,99\n`)).toThrow("unsupported columns"));
  it("requires the stated ten-worker plan only when all counts match", () => {
    const distribution = Array.from({ length: 10 }, (_, index) => ({ worker: String(index), children: 10 }));
    expect(meetsAssignmentPlan(distribution, 100)).toBe(true); expect(meetsAssignmentPlan(distribution, 99)).toBe(false);
  });
});
