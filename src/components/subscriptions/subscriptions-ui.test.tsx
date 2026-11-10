import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SAMPLE_CATALOGUE } from "@/test/sampleCatalogue";
import type { ChoiceFormState } from "@/lib/actions/formState";
import { serviceChoices, pricedPlans } from "@/shared/subscriptions";
import { PlanForm } from "./PlanForm";
import { ServicesForm } from "./ServicesForm";

const growth = SAMPLE_CATALOGUE.plans[1];
const ADA = ["lead-follow-up", "appointment-booking", "daily-brief", "scheduling-posting", "performance-report", "whatsapp-sales-agent"];

function renderServices(action = vi.fn(async (): Promise<ChoiceFormState> => ({ formError: null, values: [] })), changesLeft = 1) {
  render(<ServicesForm action={action} clientId="c-ada" choices={serviceChoices(growth, SAMPLE_CATALOGUE, ADA)} current={ADA} changesLeft={changesLeft} />);
  return action;
}

describe("ServicesForm", () => {
  it("shows what's chosen in each group, and what a swap would use", async () => {
    renderServices();

    expect(screen.getByRole("group", { name: /3 everyday automations\s*3 of 3 chosen/ })).toBeInTheDocument();
    expect(screen.getByText("Each service added in place of another uses one change. The client has 1 change left this month.")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Daily business brief"));
    await userEvent.click(screen.getByLabelText("Payment reminders and receipts"));
    expect(screen.getByText("This uses 1 of the client's 1 change left this month.")).toBeInTheDocument();
  });

  it("warns before saving more services than the plan includes, or more changes than are left", async () => {
    renderServices(undefined, 0);

    await userEvent.click(screen.getByLabelText("Payment reminders and receipts"));
    expect(screen.getByText("That's more everyday automations than the plan includes.")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Daily business brief"));
    expect(screen.getByText("This would use 1 change, but the client has none left this month.")).toBeInTheDocument();
  });

  it("shows the backend's reason when saving fails, keeping what was ticked", async () => {
    const action = renderServices(vi.fn(async () => ({ formError: "That would use 1 change, but the client has none left this month.", values: [] })));

    await userEvent.click(screen.getByLabelText("Daily business brief"));
    await userEvent.click(screen.getByLabelText("Payment reminders and receipts"));
    await act(async () => userEvent.click(screen.getByRole("button", { name: "Save services" })));

    expect(action).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("none left this month");
    expect(screen.getByLabelText("Payment reminders and receipts")).toBeChecked();
    expect(screen.getByLabelText("Daily business brief")).not.toBeChecked();
  });

  it("marks a service taken off the website that the client still has", () => {
    const catalogue = structuredClone(SAMPLE_CATALOGUE);
    catalogue.services.find((service) => service.id === "daily-brief")!.available = false;
    render(<ServicesForm action={vi.fn()} clientId="c-ada" choices={serviceChoices(growth, catalogue, ADA)} current={ADA} changesLeft={1} />);

    expect(screen.getByText(/taken off the website; keeps running while chosen/)).toBeInTheDocument();
  });
});

describe("PlanForm", () => {
  const renderPlan = (pendingPlanId: "pro" | null = null) =>
    render(
      <PlanForm action={vi.fn(async () => ({ formError: null, values: [] }))} clientId="c-ada" plans={pricedPlans(SAMPLE_CATALOGUE)} currentPlanId="growth" pendingPlanId={pendingPlanId} renewalDate="10 November 2026" />
    );

  it("offers Starter, Growth and Pro, and says when a change starts", async () => {
    renderPlan();

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText("Growth is the current plan, so nothing changes.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Pro/ }));
    expect(screen.getByText(/Pro starts at the next renewal, on 10 November 2026. Nothing is charged today/)).toBeInTheDocument();
  });

  it("starts on a waiting change, and explains dropping it", async () => {
    renderPlan("pro");

    expect(screen.getByRole("radio", { name: /Pro/ })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /Growth/ }));
    expect(screen.getByText("Keeps Growth and drops the waiting change.")).toBeInTheDocument();
  });
});
