import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthFormState } from "@/lib/auth/formState";
import { CodeForm } from "./CodeForm";
import { LoginForm } from "./LoginForm";
import { CHECK_EVERY_MS, SessionTimer } from "./SessionTimer";

vi.mock("next/navigation", () => ({ usePathname: () => "/clients" }));

const returning = (state: Partial<AuthFormState>) =>
  vi.fn(async () => ({ formError: null, fieldErrors: {}, notice: null, values: {}, ...state }) as AuthFormState);

describe("LoginForm", () => {
  it("shows why the person is here, and the stand-in's test values", () => {
    render(<LoginForm action={returning({})} next="/clients" notice="You've logged out." standIn />);

    expect(screen.getByRole("status")).toHaveTextContent("You've logged out.");
    expect(screen.getByText(/any @ifnotgod.com email works/)).toBeInTheDocument();
  });

  it("keeps the email and shows errors after a failed attempt", async () => {
    const user = userEvent.setup();
    render(<LoginForm action={returning({ formError: "That email and password don't match a team account.", values: { email: "tunde@ifnotgod.com" } })} next="/" notice={null} standIn={false} />);

    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("don't match");
    expect(screen.getByLabelText("Work email")).toHaveValue("tunde@ifnotgod.com");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });
});

describe("CodeForm", () => {
  it("says where the code went and how long it lasts, with a numeric code field", () => {
    render(<CodeForm verifyAction={returning({})} resendAction={returning({})} sentTo="tunde@ifnotgod.com" standInCode={null} />);

    expect(screen.getByText(/tunde@ifnotgod.com/)).toBeInTheDocument();
    expect(screen.getByText(/expires in 10 minutes/)).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toHaveAttribute("autocomplete", "one-time-code");
    expect(screen.getByLabelText("Code")).toHaveAttribute("inputmode", "numeric");
  });

  it("confirms a new code was sent", async () => {
    const user = userEvent.setup();
    render(<CodeForm verifyAction={returning({})} resendAction={returning({ notice: "We've sent a new code. Use the latest one." })} sentTo="t@ifnotgod.com" standInCode="123456" />);

    await user.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(await screen.findByText("We've sent a new code. Use the latest one.")).toBeInTheDocument();
    expect(screen.getByText(/The code is 123456/)).toBeInTheDocument();
  });
});

describe("SessionTimer", () => {
  afterEach(() => vi.useRealTimers());

  it("stays quiet until 5 minutes are left, then warns", () => {
    vi.useFakeTimers({ now: 0 });
    render(<SessionTimer expiresAt={10 * 60 * 1000} keepAlive={async () => 0} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5 * 60 * 1000 + CHECK_EVERY_MS));

    expect(screen.getByRole("alert")).toHaveTextContent(/Your session ends in [45] minutes/);
  });

  it("restarts the hour with Stay signed in", async () => {
    vi.useFakeTimers({ now: 0, shouldAdvanceTime: true });
    const keepAlive = vi.fn(async () => Date.now() + 60 * 60 * 1000);
    render(<SessionTimer expiresAt={4 * 60 * 1000} keepAlive={keepAlive} />);
    act(() => vi.advanceTimersByTime(CHECK_EVERY_MS));

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Stay signed in" }));

    expect(keepAlive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sends the person to log in when the hour is up", () => {
    vi.useFakeTimers({ now: 0 });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(<SessionTimer expiresAt={CHECK_EVERY_MS} keepAlive={async () => 0} />);

    act(() => vi.advanceTimersByTime(CHECK_EVERY_MS * 2));

    expect(assign).toHaveBeenCalledWith("/login?next=%2Fclients&reason=expired");
    vi.unstubAllGlobals();
  });
});
