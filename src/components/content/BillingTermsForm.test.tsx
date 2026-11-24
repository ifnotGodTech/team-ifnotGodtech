import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SAMPLE_CATALOGUE } from "@/test/sampleCatalogue";
import { BillingTermsForm } from "./BillingTermsForm";

const terms = SAMPLE_CATALOGUE.billingTerms;

function renderForm() {
  const action = vi.fn(async () => ({ formError: null, fieldErrors: {}, notice: null }));
  render(<BillingTermsForm action={action} terms={terms} />);
  return { user: userEvent.setup(), summary: () => within(screen.getByText("What new clients will see").parentElement!) };
}

describe("BillingTermsForm", () => {
  it("shows a row for each way of paying, and what new clients see today", () => {
    const { summary } = renderForm();

    expect(screen.getByLabelText("Setup fee, monthly")).toHaveValue("charged");
    expect(screen.getByText(/No free months on monthly/)).toBeInTheDocument();
    expect(summary().getByText("Monthly: a ₦100,000 setup fee")).toBeInTheDocument();
    expect(summary().getByText("6 months upfront: no setup fee")).toBeInTheDocument();
    expect(summary().getByText("12 months upfront: 2 months free, and a ₦100,000 setup fee")).toBeInTheDocument();
  });

  it("updates what new clients will see as a promotion is set up", async () => {
    const { user, summary } = renderForm();

    await user.selectOptions(screen.getByLabelText("Setup fee, monthly"), "waived");
    await user.clear(screen.getByLabelText("Months free, 6 months upfront"));
    await user.type(screen.getByLabelText("Months free, 6 months upfront"), "1");

    expect(summary().getByText("Monthly: no setup fee")).toBeInTheDocument();
    expect(summary().getByText("6 months upfront: 1 month free, and no setup fee")).toBeInTheDocument();
  });

  it("asks for valid values before showing the offer", async () => {
    const { user, summary } = renderForm();

    await user.clear(screen.getByLabelText("Months free, 12 months upfront"));
    await user.type(screen.getByLabelText("Months free, 12 months upfront"), "12");

    expect(summary().getByText("Finish the values above to see the offer.")).toBeInTheDocument();
  });

  it("says when the whole fee is off", async () => {
    const { user, summary } = renderForm();

    await user.clear(screen.getByLabelText("Setup fee (₦)"));
    await user.type(screen.getByLabelText("Setup fee (₦)"), "0");

    expect(summary().getByText("12 months upfront: 2 months free, and no setup fee")).toBeInTheDocument();
  });
});
