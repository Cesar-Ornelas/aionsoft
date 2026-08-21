import { fail } from '@sveltejs/kit';
import { bootstrapPocketBase } from '$lib/server/crm-bootstrap.js';
import { bootstrapManagement } from '$lib/server/management-bootstrap.js';

export async function load() {
  return {
    title: 'PocketBase setup'
  };
}

export const actions = {
  default: async () => {
    try {
      const crmResult = await bootstrapPocketBase();
      const managementResult = await bootstrapManagement();

      return {
        success: true,
        message: `${crmResult.message} ${managementResult.message}`
      };
    } catch (error) {
      return fail(500, {
        success: false,
        message: error?.message || 'Unable to bootstrap PocketBase collections.'
      });
    }
  }
};
