import { handleLogto } from '@logto/sveltekit';
import { getLogtoConfig, getLogtoCookieConfig } from '$lib/server/auth';

export const handle = handleLogto(getLogtoConfig(), getLogtoCookieConfig());