import Link from "next/link";
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from "react";
import { cn } from "@/shared/cn";

type Variant = "primary" | "secondary";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-maroon text-white hover:bg-maroon-bright",
  secondary: "border border-maroon bg-card text-maroon hover:bg-maroon-tint",
};

export const buttonClasses = (variant: Variant = "primary", className?: string) =>
  cn(
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4.5 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    className
  );

export function Button({ variant, className, type = "button", ...rest }: ComponentPropsWithRef<"button"> & { variant?: Variant }) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}

export function ButtonLink({ variant, className, ...rest }: ComponentPropsWithoutRef<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClasses(variant, className)} {...rest} />;
}
