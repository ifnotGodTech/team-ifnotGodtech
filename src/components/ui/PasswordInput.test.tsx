import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField";

describe("password fields", () => {
  it("hide what's typed until the eye button shows it, and hide it again", async () => {
    const user = userEvent.setup();
    render(<FormField id="password" label="Password" type="password" autoComplete="current-password" required />);
    const field = screen.getByLabelText("Password");
    await user.type(field, "a secret");

    expect(field).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(field).toHaveAttribute("type", "text");
    expect(field).toHaveValue("a secret");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("don't submit the form when the eye button is pressed", () => {
    render(<FormField id="password" label="Password" type="password" />);

    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("type", "button");
  });
});
