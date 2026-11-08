/** A form's error, read out straight away, and its confirmation once saved. */
export function FormMessages({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      <p role="alert" className="font-semibold text-maroon empty:hidden">
        {error}
      </p>
      <p role="status" className="font-semibold text-success empty:hidden">
        {notice}
      </p>
    </>
  );
}
