// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces.
import type { CurrentAppUser } from "$lib/entities/access-control";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user?: unknown;
      currentAppUser?: CurrentAppUser | null;
      sessionUserKey?: string | null;
    }
    // interface PageData {}
    // interface Platform {}
  }
}

export {};
