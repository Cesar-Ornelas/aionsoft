import { writable } from 'svelte/store';

const MAX_VISIBLE_TOASTS = 4;

function createToastEntry(message, variant = 'default') {
  return {
    id: crypto.randomUUID(),
    message,
    variant,
    createdAt: Date.now()
  };
}

const store = writable([]);

function pushToast(message, variant = 'default') {
  if (!message) return;

  const entry = createToastEntry(String(message), variant);

  store.update((items) => {
    const next = [...items, entry];
    return next.slice(-MAX_VISIBLE_TOASTS);
  });

  setTimeout(() => {
    dismissToast(entry.id);
  }, 4200);
}

export function dismissToast(id) {
  store.update((items) => items.filter((item) => item.id !== id));
}

export const toast = {
  success(message) {
    pushToast(message, 'success');
  },
  error(message) {
    pushToast(message, 'error');
  },
  info(message) {
    pushToast(message, 'info');
  }
};

export const toastStore = store;
