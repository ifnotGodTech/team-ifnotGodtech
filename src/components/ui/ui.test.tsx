import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmPanel } from "./ConfirmPanel";
import { DataTable } from "./DataTable";
import { FormField } from "./FormField";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("says the status in words", () => {
    render(<StatusBadge tone="warning">Ends 10 Nov 2026</StatusBadge>);

    expect(screen.getByText("Ends 10 Nov 2026")).toHaveClass("bg-warning-bg");
  });
});

describe("DataTable", () => {
  const columns = [
    { key: "name", header: "Client", cell: (row: { name: string }) => row.name },
    { key: "amount", header: "Amount", cell: () => "₦40,000", align: "right" as const },
  ];

  it("shows rows in a labelled box that scrolls on its own", () => {
    render(<DataTable label="Clients" columns={columns} rows={[{ name: "Ada" }]} rowKey={(row) => row.name} empty="None" />);

    const region = screen.getByRole("region", { name: "Clients" });
    expect(region).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveClass("text-right");
    expect(screen.getByRole("cell", { name: "Ada" })).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    render(<DataTable label="Clients" columns={columns} rows={[]} rowKey={() => ""} empty={<p>No clients yet</p>} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("No clients yet")).toBeInTheDocument();
  });
});

describe("FormField", () => {
  it("links its hint and error to the input", () => {
    render(<FormField id="price" label="Monthly price" hint="Whole naira" error="Must be a number." defaultValue="40,000" />);

    const input = screen.getByLabelText("Monthly price");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Must be a number. Whole naira");
    expect(input).toHaveValue("40,000");
  });
});

describe("ConfirmPanel", () => {
  const setup = () => {
    const action = vi.fn();
    render(
      <ConfirmPanel triggerLabel="Cancel subscription" title="Cancel Ada Obi's plan?" confirmLabel="Yes, cancel it" action={action} fields={{ clientId: "c1" }}>
        <p>Everything keeps working until 10 November 2026.</p>
      </ConfirmPanel>
    );
    return { action, user: userEvent.setup() };
  };

  it("asks first, saying what will happen, and focuses the question", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel subscription" }));

    expect(screen.getByRole("alertdialog", { name: "Cancel Ada Obi's plan?" })).toHaveTextContent("keeps working until 10 November 2026");
    expect(screen.getByRole("heading", { name: "Cancel Ada Obi's plan?" })).toHaveFocus();
  });

  it("closes with Go back or Escape, returning focus to the button", async () => {
    const { user, action } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel subscription" }));
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByRole("button", { name: "Cancel subscription" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cancel subscription" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Cancel subscription" })).toHaveFocus();
    expect(action).not.toHaveBeenCalled();
  });

  it("runs the action with its fields only when confirmed", async () => {
    const { user, action } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel subscription" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel it" }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(action.mock.calls[0][0])).toEqual({ clientId: "c1" });
  });
});
