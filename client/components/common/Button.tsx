"use client";

import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
  href?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-sm rounded-xl min-h-[44px]",
  md: "px-6 py-3 text-base rounded-2xl min-h-[48px]",
  lg: "px-8 py-4 text-lg rounded-2xl min-h-[52px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  href,
  ...props
}: ButtonProps) {
  const base = `
    relative inline-flex items-center justify-center gap-2
    font-bold transition-all duration-300 cursor-pointer select-none
    active:scale-[0.97] touch-manipulation
    ${sizeClasses[size]}
  `;

  const variants: Record<ButtonVariant, string> = {
    primary: "web-btn-primary",
    secondary: "web-btn-secondary",
    ghost: "web-btn-ghost",
  };

  const cls = `${base} ${variants[variant]} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={cls} style={{ textDecoration: "none" }}>
        <span className="relative z-10">{children}</span>
      </Link>
    );
  }

  return (
    <button className={cls} {...props}>
      <span className="relative z-10">{children}</span>
    </button>
  );
}
