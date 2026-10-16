import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminUsers } from "./admin-users";
import { AdminCenters } from "./admin-centers";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/fetch", () => ({ apiFetch }));

const district = { id: "district", name: "District Admin", email: "district@test", role: "DISTRICT_ADMIN" as const, preferredLanguage: "en" as const, centerIds: [] };
const centerAdmin = { id: "center-admin", name: "Center Admin", email: "center@test", role: "CENTER_ADMIN" as const, preferredLanguage: "en" as const, centerIds: ["center-1"] };

describe("admin provisioning controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/admin/centers" && !init) return [{ id: "center-1", name: "Center One", code: "ONE", village: "Village", district: "District", state: "State", active: true }];
      if (path === "/api/v1/children?pageSize=100") return { items: [{ id: "child-1", fullName: "Child One", internalId: "BAL-1" }] };
      if (path === "/api/v1/admin/users" && init?.method === "POST") return { id: "parent-1", name: "Guardian One", email: "guardian@test", phone: "12345678", role: "PARENT", centerIds: [], active: true };
      if (path.startsWith("/api/v1/admin/users/") && init?.method === "PATCH") return { id: "worker-1", name: "Worker One", email: "worker@test", phone: "12345678", role: "WORKER", centerIds: ["center-1"], active: false };
      if (path === "/api/v1/admin/centers" && init?.method === "POST") return { id: "center-2", code: "TWO", name: "Center Two", village: "Village", district: "District", state: "State", active: true };
      return [];
    });
  });

  it("submits a parent account with an explicit child guardian link and refreshes the list", async () => {
    const user = userEvent.setup();
    render(<AdminUsers session={centerAdmin} users={[]} databaseMode />);
    await user.click(screen.getByRole("button", { name: /add user/i }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/centers"));
    await user.selectOptions(screen.getByLabelText(/^role/i), "PARENT");
    await screen.findByText(/verified child guardian records/i);
    await user.type(screen.getByLabelText(/full name/i), "Guardian One");
    await user.type(screen.getByLabelText(/^email/i), "guardian@test");
    await user.type(screen.getByLabelText(/^phone/i), "12345678");
    await user.type(screen.getByLabelText(/initial password/i), "a-strong-test-password");
    await user.click(screen.getByRole("checkbox", { name: /Child One/ }));
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByText("guardian@test");
    const createCall = apiFetch.mock.calls.find(([path, init]) => path === "/api/v1/admin/users" && init?.method === "POST");
    if (!createCall) throw new Error("Account creation API was not called.");
    expect(JSON.parse(createCall[1].body as string)).toMatchObject({ role: "PARENT", guardianLinks: [{ childId: "child-1", relationship: "MOTHER" }] });
  });

  it("sends account deactivation to the API rather than changing only local display state", async () => {
    const user = userEvent.setup();
    render(<AdminUsers session={centerAdmin} users={[{ id: "worker-1", name: "Worker One", email: "worker@test", role: "WORKER", phone: "12345678", centerIds: ["center-1"], active: true }]} databaseMode />);
    await user.click(screen.getByTitle("Deactivate"));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/users/worker-1", expect.objectContaining({ method: "PATCH" })));
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
  });

  it("creates centers through the API and shows errors returned by it", async () => {
    const user = userEvent.setup();
    render(<AdminCenters session={district} centers={[]} databaseMode />);
    await user.click(screen.getByRole("button", { name: /add center/i }));
    for (const [label, value] of [["Center code", "TWO"], ["Name", "Center Two"], ["Village", "Village"], ["District", "District"], ["State", "State"]]) await user.type(screen.getByLabelText(label), value);
    await user.click(screen.getByRole("button", { name: /create center/i }));
    await screen.findByText("Center Two");
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/centers", expect.objectContaining({ method: "POST" })));
  });
});
