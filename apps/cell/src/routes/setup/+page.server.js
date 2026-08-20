import { fail } from '@sveltejs/kit';
import { bootstrapPocketBase } from '$lib/server/crm-bootstrap.js';

export async function load() {
  return {
    title: 'PocketBase setup'
  };
}

export const actions = {
  default: async () => {
    try {
      const result = await bootstrapPocketBase();

      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      return fail(500, {
        success: false,
        message: error?.message || 'Unable to bootstrap PocketBase collections.'
      });
    }
  }
};
