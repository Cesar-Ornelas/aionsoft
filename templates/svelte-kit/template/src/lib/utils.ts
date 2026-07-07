import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "svelte/elements";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export type WithElementRef<Props extends object, Element = HTMLElement> = Props & {
  ref?: Element | null;
};

export type WithoutChildren<Props extends object> = Props extends { children?: unknown }
  ? Omit<Props, "children">
  : Props;

export type WithoutChildrenOrChild<Props extends object> = Props extends {
  children?: unknown;
  child?: unknown;
}
  ? Omit<Props, "children" | "child">
  : Props extends { children?: unknown }
    ? Omit<Props, "children">
    : Props extends { child?: unknown }
      ? Omit<Props, "child">
      : Props;

  export type WithoutChild<Props extends object> = Props extends { child?: unknown }
    ? Omit<Props, "child">
    : Props;

export type ElementProps = HTMLAttributes<HTMLElement>;