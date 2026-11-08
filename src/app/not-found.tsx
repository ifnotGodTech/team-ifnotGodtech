import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-[1.75rem] font-extrabold">Page not found</h1>
      <p className="text-text-dim">This page doesn&apos;t exist, or isn&apos;t available.</p>
      <Link href="/" className="font-semibold text-maroon underline">
        Go to the overview
      </Link>
    </main>
  );
}
