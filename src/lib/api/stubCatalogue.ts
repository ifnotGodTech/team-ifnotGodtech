import type { Catalogue, PlanId, Service, ServiceGroupId } from "@/types/catalogue";

// The stand-in's plans and services, matching what WEB shows. In phase 6 the dashboard edits
// these through the backend. The "any similar-sized task" entry is agreed in the audit, so it's left out.

const service = (id: string, group: ServiceGroupId, name: string, includedFrom: PlanId): Service => ({ id, group, name, includedFrom, available: true });

export const STUB_CATALOGUE: Catalogue = {
  plans: [
    { id: "starter", name: "Starter", monthlyPrice: 20_000, monthlyChanges: 1, allowances: { everyday: 1, social: 1, agents: 0 } },
    { id: "growth", name: "Growth", monthlyPrice: 40_000, monthlyChanges: 1, allowances: { everyday: 3, social: 2, agents: 1 } },
    { id: "pro", name: "Pro", monthlyPrice: 80_000, monthlyChanges: 2, allowances: { everyday: 6, social: 4, agents: 2 } },
    { id: "custom", name: "Custom", monthlyPrice: null, monthlyChanges: "agreed", allowances: { everyday: "agreed", social: "agreed", agents: "agreed" } },
  ],
  groups: [
    { id: "everyday", name: "Everyday automations", unitSingular: "everyday automation", unitPlural: "everyday automations" },
    { id: "social", name: "Social and content", unitSingular: "social or content service", unitPlural: "social or content services" },
    { id: "agents", name: "AI agents", unitSingular: "AI agent", unitPlural: "AI agents" },
  ],
  services: [
    service("lead-follow-up", "everyday", "Lead follow-up", "starter"),
    service("appointment-booking", "everyday", "Appointment booking and reminders", "starter"),
    service("payment-reminders", "everyday", "Payment reminders and receipts", "starter"),
    service("daily-brief", "everyday", "Daily business brief", "starter"),
    service("digital-product-delivery", "everyday", "Digital product delivery", "starter"),
    service("brand-deal-inbox", "everyday", "Brand deal inbox", "starter"),
    service("scheduling-posting", "social", "Scheduling and posting", "starter"),
    service("performance-report", "social", "Weekly performance report", "starter"),
    service("comment-to-dm", "social", "Comment-to-DM funnels", "starter"),
    service("dm-assistant", "social", "DM assistant", "growth"),
    service("newsletter", "social", "Newsletter from your content", "growth"),
    service("video-repurposing", "social", "One video into many posts", "growth"),
    service("whatsapp-sales-agent", "agents", "WhatsApp sales agent", "growth"),
    service("staff-assistant", "agents", "Staff assistant", "growth"),
    service("document-reader", "agents", "Document reader", "pro"),
    service("ai-call-agent", "agents", "AI call agent", "pro"),
  ],
};
