"use client";

import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
};

type AsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type AsLink = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = AsButton | AsLink;

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-2xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base = `
    relative inline-flex items-center justify-center gap-2
    font-bold transition-all duration-300 cursor-pointer
    ${sizeClasses[size]}
  `;

  const variants: Record<ButtonVariant, string> = {
    primary: "web-btn-primary",
    secondary: "web-btn-secondary",
    ghost: "web-btn-ghost",
  };

  const cls = `${base} ${variants[variant]} ${className}`.trim();

  if ("href" in props && props.href) {
    const { href, ...rest } = props as AsLink;
    return (
      <a href={href} className={cls} {...rest}>
        <span className="relative z-10">{children}</span>
      </a>
    );
  }

  const buttonProps = props as AsButton;
  return (
    <button className={cls} {...buttonProps}>
      <span className="relative z-10">{children}</span>
    </button>
  );
}
