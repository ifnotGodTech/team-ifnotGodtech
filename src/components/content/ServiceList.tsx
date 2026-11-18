import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmPanel } from "@/components/ui/ConfirmPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { setServiceShownAction } from "@/lib/actions/content";
import { HIDE_RULE, plansList } from "@/shared/content";
import type { Catalogue } from "@/types/catalogue";

/** Every service, grouped, with its plans, whether it's on the website, and ways to change both. */
export function ServiceList({ catalogue }: { catalogue: Catalogue }) {
  const priced = catalogue.plans.filter((plan) => plan.monthlyPrice !== null);

  return (
    <div className="flex flex-col gap-5">
      {catalogue.groups.map((group) => {
        const services = catalogue.services.filter((service) => service.group === group.id);
        return (
          <section key={group.id} aria-labelledby={`group-${group.id}`} className="rounded-[10px] border border-line bg-card px-5 pb-3 pt-4">
            <h2 id={`group-${group.id}`} className="text-[1.15rem] font-extrabold">
              {group.name}
            </h2>
            {services.length === 0 ? (
              <p className="py-3 text-text-dim">No services in this group yet.</p>
            ) : (
              <ul>
                {services.map((service) => (
                  <li key={service.id} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border-t border-line-soft py-3.5 first:border-t-0">
                    <div className="flex min-w-0 grow basis-64 flex-col">
                      <span className="font-bold">{service.name}</span>
                      <span className="text-[0.88rem] text-text-dim">
                        In {plansList(priced, service.plans)} · {service.problem}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {service.available ? <StatusBadge tone="success">Shown on the site</StatusBadge> : <StatusBadge tone="neutral">Hidden</StatusBadge>}
                      <Link href={`/content?tab=services&edit=${service.id}`} className="font-semibold text-maroon underline" aria-label={`Edit ${service.name}`}>
                        Edit
                      </Link>
                      {service.available ? (
                        <ConfirmPanel
                          triggerLabel="Hide from the website"
                          title={`Hide ${service.name} from the website?`}
                          confirmLabel="Hide it"
                          action={setServiceShownAction}
                          fields={{ serviceId: service.id, shown: "false" }}
                        >
                          <p>{HIDE_RULE}</p>
                        </ConfirmPanel>
                      ) : (
                        <form action={setServiceShownAction}>
                          <input type="hidden" name="serviceId" value={service.id} />
                          <input type="hidden" name="shown" value="true" />
                          <Button type="submit" variant="secondary">
                            Show on the website
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
