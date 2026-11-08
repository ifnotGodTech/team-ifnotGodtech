import { formatNaira, formatShortDate } from "@/shared/format";
import type { Payment } from "@/types/subscription";

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  return (
    <section aria-labelledby="payments-heading" className="flex flex-col gap-2.5 rounded-[10px] border border-line bg-card p-5.5">
      <h2 id="payments-heading" className="text-[1.2rem] font-extrabold">
        Payments
      </h2>
      {payments.length === 0 ? (
        <p className="text-text-dim">No payments yet.</p>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="Payment list" tabIndex={0}>
          <table className="w-full border-collapse text-[0.94rem]">
            <thead>
              <tr className="text-left text-[0.81rem] text-text-dim">
                <th scope="col" className="py-1.5 pr-2.5 font-semibold">Date</th>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">For</th>
                <th scope="col" className="py-1.5 pl-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-line-soft">
                  <td className="whitespace-nowrap py-2.5 pr-2.5">{formatShortDate(payment.paidOn)}</td>
                  <td className="px-2.5 py-2.5">{payment.description}</td>
                  <td className="py-2.5 pl-2.5 text-right font-semibold">{formatNaira(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[0.88rem] text-text-dim">Paid through Flutterwave. Card details are never shown here.</p>
    </section>
  );
}
