import type { Catalogue, PlanId, Service, SiteText } from "@/types/catalogue";

// The stand-in's plans, services and site text, matching what WEB shows today. Staff edit them
// on Site content. The "any similar-sized task" entry is agreed in the audit, so it's left out.

const FROM: Record<string, PlanId[]> = { starter: ["starter", "growth", "pro"], growth: ["growth", "pro"], pro: ["pro"] };
const service = (id: string, group: string, name: string, from: keyof typeof FROM, problem: string): Service => ({ id, group, name, problem, plans: FROM[from], available: true });

export const SAMPLE_CATALOGUE: Catalogue = {
  plans: [
    { id: "starter", name: "Starter", monthlyPrice: 20_000, monthlyChanges: 1, allowances: { everyday: 1, social: 1, agents: 0 }, lines: ["Landing or link-in-bio page", "Email support"], recommended: false },
    { id: "growth", name: "Growth", monthlyPrice: 40_000, monthlyChanges: 1, allowances: { everyday: 3, social: 2, agents: 1 }, lines: ["Landing page with more sections", "Priority WhatsApp support"], recommended: true },
    { id: "pro", name: "Pro", monthlyPrice: 80_000, monthlyChanges: 2, allowances: { everyday: 6, social: 4, agents: 2 }, lines: ["Small multi-page site", "Priority WhatsApp support", "Monthly review call"], recommended: false },
    { id: "custom", name: "Custom", monthlyPrice: null, monthlyChanges: "agreed", allowances: { everyday: "agreed", social: "agreed", agents: "agreed" }, lines: ["Larger apps and platforms", "Support agreed with you"], recommended: false },
  ],
  groups: [
    { id: "everyday", name: "Everyday automations", unitSingular: "everyday automation", unitPlural: "everyday automations" },
    { id: "social", name: "Social and content", unitSingular: "social or content service", unitPlural: "social or content services" },
    { id: "agents", name: "AI agents", unitSingular: "AI agent", unitPlural: "AI agents" },
  ],
  services: [
    service("lead-follow-up", "everyday", "Lead follow-up", "starter", "We forget to call people back."),
    service("appointment-booking", "everyday", "Appointment booking and reminders", "starter", "People book, then don't show up."),
    service("payment-reminders", "everyday", "Payment reminders and receipts", "starter", "I'm always chasing money."),
    service("daily-brief", "everyday", "Daily business brief", "starter", "I don't know my numbers until it's too late."),
    service("digital-product-delivery", "everyday", "Digital product delivery", "starter", "I send files and confirm payments by hand."),
    service("brand-deal-inbox", "everyday", "Brand deal inbox", "starter", "Sponsorship emails get buried."),
    service("scheduling-posting", "social", "Scheduling and posting", "starter", "Posting takes hours each week."),
    service("performance-report", "social", "Weekly performance report", "starter", "I don't know what's working."),
    service("comment-to-dm", "social", "Comment-to-DM funnels", "starter", "People comment and I lose the sale."),
    service("dm-assistant", "social", "DM assistant", "growth", "I can't answer everyone."),
    service("newsletter", "social", "Newsletter from your content", "growth", "I never get round to writing it."),
    service("video-repurposing", "social", "One video into many posts", "growth", "I can't post everywhere."),
    service("whatsapp-sales-agent", "agents", "WhatsApp sales agent", "growth", "Customers ask at night and buy elsewhere."),
    service("staff-assistant", "agents", "Staff assistant", "growth", "Everyone keeps asking the same questions."),
    service("document-reader", "agents", "Document reader", "pro", "Staff retype invoices and forms all day."),
    service("ai-call-agent", "agents", "AI call agent", "pro", "I miss calls and lose customers."),
  ],
};

/** The home page text, as WEB shows it today. */
export const SAMPLE_SITE_TEXT: SiteText = {
  headline: "Your business, answering back while you sleep.",
  introduction:
    "We build and run AI automations that follow up leads, answer customers and handle repetitive work. You pay one monthly fee, and you don't need to touch any technology.",
  closingCallToAction: "What's the task wasting your time?",
};
