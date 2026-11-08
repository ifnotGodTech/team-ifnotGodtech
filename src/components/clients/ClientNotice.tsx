import { cn } from "@/shared/cn";

// Confirmations shown after an action sends staff back to the client's page.

type Tone = "success" | "error";

const NOTICES: Record<string, [Tone, string]> = {
  "reset=sent": ["success", "Password reset email sent."],
  "reset=failed": ["error", "We couldn't send the password reset email. Please try again."],
  "done=cancelled": ["success", "Subscription cancelled. The client is emailed to confirm."],
  "done=kept": ["success", "Plan kept. It renews automatically again."],
  "done=services": ["success", "Services saved. The client is emailed to confirm."],
  "done=plan": ["success", "Plan change saved. The client is emailed to confirm."],
  "failed=cancel": ["error", "We couldn't cancel the subscription. Check its status below and try again."],
  "failed=keep": ["error", "We couldn't keep the plan. Check its status below and try again."],
};

/** The notice for a page's query, such as { done: "cancelled" }, or nothing. */
export function ClientNotice({ query }: { query: Record<string, string | string[] | undefined> }) {
  const key = Object.entries(query).map(([name, value]) => `${name}=${value}`).find((item) => item in NOTICES);
  if (!key) return null;

  const [tone, text] = NOTICES[key];
  return (
    <p
      role="status"
      className={cn(
        "rounded-md border px-4 py-3 font-semibold",
        tone === "success" ? "border-success/40 bg-success-bg text-success" : "border-maroon bg-maroon-tint text-maroon"
      )}
    >
      {text}
    </p>
  );
}
