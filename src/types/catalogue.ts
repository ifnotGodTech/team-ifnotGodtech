// The contract with the backend's catalogue API: plans and services, as WEB shows them.

export type PlanId = "starter" | "growth" | "pro" | "custom";

export type ServiceGroupId = "everyday" | "social" | "agents";

/** How many services a plan includes from a group. "agreed" means set per client. */
export type Allowance = number | "agreed";

export type Plan = {
  id: PlanId;
  name: string;
  /** In naira a month. Null when quoted after the audit. */
  monthlyPrice: number | null;
  /** Changes or service swaps a month. "agreed" means set per client. */
  monthlyChanges: number | "agreed";
  allowances: Record<ServiceGroupId, Allowance>;
};

export type ServiceGroup = {
  id: ServiceGroupId;
  name: string;
  unitSingular: string;
  unitPlural: string;
};

export type Service = {
  id: string;
  group: ServiceGroupId;
  name: string;
  /** The lowest plan that includes it. Higher plans include it too. */
  includedFrom: PlanId;
  /** False when it's been taken off the website. Clients who have it keep it. */
  available: boolean;
};

export type Catalogue = {
  /** Lowest to highest. */
  plans: Plan[];
  groups: ServiceGroup[];
  services: Service[];
};
