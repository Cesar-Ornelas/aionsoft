import { writable } from "svelte/store";

export type ToastTone = "default" | "success" | "error";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone?: ToastTone;
};

const DEFAULT_DURATION = 3200;
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

const { subscribe, update } = writable<ToastItem[]>([]);

function scheduleDismiss(id: number, duration = DEFAULT_DURATION) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
  }

  timers.set(
    id,
    setTimeout(() => {
      dismiss(id);
    }, duration)
  );
}

export function toast(input: { title: string; description?: string; tone?: ToastTone; duration?: number }) {
  const id = nextId += 1;
  const item: ToastItem = {
    id,
    title: input.title,
    description: input.description,
    tone: input.tone ?? "default"
  };

  update((items) => [...items, item]);
  scheduleDismiss(id, input.duration);
  return id;
}

export function dismiss(id: number) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }

  update((items) => items.filter((item) => item.id !== id));
}

export function clearToasts() {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }

  timers.clear();
  update(() => []);
}

export const toastStore = { subscribe };
export const toastSuccess = (title: string, description?: string) => toast({ title, description, tone: "success" });
export const toastError = (title: string, description?: string) => toast({ title, description, tone: "error" });
