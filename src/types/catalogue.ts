// The contract with the backend's catalogue API: plans, services and groups, as WEB shows them.
// Services and groups are records staff can add; plans are fixed until adding plans is built.

export type PlanId = "starter" | "growth" | "pro" | "custom";

/** How many services a plan includes from a group. "agreed" means set per client. */
export type Allowance = number | "agreed";

export type Plan = {
  id: PlanId;
  name: string;
  /** In naira a month. Null when quoted after the audit. */
  monthlyPrice: number | null;
  /** Changes or service swaps a month. "agreed" means set per client. */
  monthlyChanges: number | "agreed";
  /** By group id. A group missing here counts as 0. */
  allowances: Record<string, Allowance>;
  /** Other things the plan lists on the website, in order, such as "Monthly review call". */
  lines: string[];
  /** Shown as recommended on the website. At most one plan is. */
  recommended: boolean;
};

export type ServiceGroup = {
  id: string;
  name: string;
  /** "everyday automation", as in "1 everyday automation". */
  unitSingular: string;
  /** "everyday automations", as in "3 everyday automations". */
  unitPlural: string;
};

export type Service = {
  id: string;
  group: string;
  name: string;
  /** The problem it solves, in the client's own words, shown under its name on the website. */
  problem: string;
  /** Priced plans that include it. Custom plans can include any service, as agreed. */
  plans: PlanId[];
  /** False when it's been taken off the website. Clients who have it keep it. */
  available: boolean;
};

export type Catalogue = {
  /** Lowest to highest. */
  plans: Plan[];
  groups: ServiceGroup[];
  services: Service[];
};

export type SiteText = {
  headline: string;
  introduction: string;
  closingCallToAction: string;
};

/** What staff can change on a plan. */
export type PlanUpdate = Pick<Plan, "monthlyPrice" | "monthlyChanges" | "allowances" | "lines" | "recommended">;

/** A new service has no id yet. */
export type ServiceDraft = Omit<Service, "id" | "available"> & { id: string | null };

export type GroupDraft = Omit<ServiceGroup, "id"> & { id: string | null };
