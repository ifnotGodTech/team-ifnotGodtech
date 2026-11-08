import type { ClientDetail } from "@/types/client";

// Made-up example clients for the stand-in backend. None of these are real people.

type Seed = Omit<ClientDetail, "id" | "history"> & { id: string };

const SEEDS: Seed[] = [
  { id: "c-ada", fullName: "Ada Obi", businessName: "Obi Logistics", email: "ada@obilogistics.com", phone: "+234 800 000 0001", planName: "Growth", planStatus: "active", joinedOn: "2026-10-08", signInMethod: "password" },
  { id: "c-chinedu", fullName: "Chinedu Eze", businessName: "Eze Pharmacy", email: "chinedu@ezepharmacy.ng", phone: "+234 800 000 0002", planName: "Starter", planStatus: "active", joinedOn: "2026-10-12", signInMethod: "password" },
  { id: "c-grace", fullName: "Grace Okon", businessName: "Okon Events", email: "grace@okonevents.com", planName: "Pro", planStatus: "active", joinedOn: "2026-05-14", signInMethod: "google" },
  { id: "c-funmi", fullName: "Funmi Adeyemi", email: "funmi@example.com", planName: "Pro", planStatus: "cancelled", joinedOn: "2026-09-03", signInMethod: "google" },
  { id: "c-musa", fullName: "Musa Bello", businessName: "Bello Autos", email: "musa@belloautos.ng", planName: null, planStatus: "none", joinedOn: "2026-11-06", signInMethod: "password" },
  { id: "c-ifeoma", fullName: "Ifeoma Nwosu", businessName: "Nwosu Dental", email: "ifeoma@nwosudental.com", phone: "+234 800 000 0006", planName: "Growth", planStatus: "active", joinedOn: "2026-08-21", signInMethod: "password" },
  { id: "c-kunle", fullName: "Kunle Ade", businessName: "Ade Prints", email: "kunle@adeprints.ng", planName: "Starter", planStatus: "cancelled", joinedOn: "2026-07-28", signInMethod: "password" },
  { id: "c-bisi", fullName: "Bisi Lawal", businessName: "Lawal Bakery", email: "bisi@lawalbakery.ng", planName: "Starter", planStatus: "active", joinedOn: "2026-09-19", signInMethod: "password" },
  { id: "c-emeka", fullName: "Emeka Okafor", businessName: "Okafor Realty", email: "emeka@okaforrealty.com", planName: "Pro", planStatus: "active", joinedOn: "2026-06-02", signInMethod: "google" },
  { id: "c-halima", fullName: "Halima Yusuf", email: "halima@example.com", planName: null, planStatus: "none", joinedOn: "2026-11-02", signInMethod: "google" },
  { id: "c-tolu", fullName: "Tolu Bakare", businessName: "Bakare Fitness", email: "tolu@bakarefitness.ng", planName: "Growth", planStatus: "active", joinedOn: "2026-04-11", signInMethod: "password" },
  { id: "c-ngozi", fullName: "Ngozi Umeh", businessName: "Umeh Fashion", email: "ngozi@umehfashion.com", planName: null, planStatus: "none", joinedOn: "2026-10-30", signInMethod: "password" },
  { id: "c-segun", fullName: "Segun Afolabi", businessName: "Afolabi Clinic", email: "segun@afolabiclinic.ng", planName: "Growth", planStatus: "active", joinedOn: "2026-03-05", signInMethod: "password" },
];

function historyFor(client: Seed): ClientDetail["history"] {
  const entries: ClientDetail["history"] = [
    { id: `${client.id}-joined`, at: `${client.joinedOn}T09:00:00Z`, text: "Created an account", by: "the client" },
  ];
  if (client.planName) {
    entries.unshift({ id: `${client.id}-subscribed`, at: `${client.joinedOn}T09:20:00Z`, text: `Subscribed to ${client.planName}, monthly`, by: "the client" });
  }
  if (client.planStatus === "cancelled") {
    entries.unshift({ id: `${client.id}-cancelled`, at: "2026-11-07T15:40:00Z", text: "Cancelled the subscription", by: "the client" });
  }
  return entries;
}

export const STUB_CLIENTS: ClientDetail[] = SEEDS.map((seed) => ({ ...seed, history: historyFor(seed) }));
