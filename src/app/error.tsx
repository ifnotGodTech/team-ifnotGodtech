"use client";

// Shown when a page fails, most often because the backend can't be reached. The error's own text
// is never shown: in production Next hides it anyway, and it isn't written for people.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-[1.75rem] font-extrabold">Something went wrong</h1>
      <p className="text-text-dim">
        The dashboard can&apos;t reach the server right now, or something failed on our side. Your work hasn&apos;t been
        lost. Please try again in a moment.
      </p>
      <button type="button" onClick={reset} className="cursor-pointer font-semibold text-maroon underline">
        Try again
      </button>
    </main>
  );
}
