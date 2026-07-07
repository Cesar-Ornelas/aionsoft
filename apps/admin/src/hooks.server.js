import { handleLogto } from '@logto/sveltekit';
import { getLogtoConfig, getLogtoCookieConfig } from '$lib/server/auth';

const LOGTO_CONSENT_COOKIE = 'logto-consent-granted';

const logtoHandle = handleLogto(getLogtoConfig(), getLogtoCookieConfig());

export async function handle({ event, resolve }) {
	return logtoHandle({
		event,
		resolve: async (scopedEvent) => {
			if (scopedEvent.locals.user && !scopedEvent.cookies.get(LOGTO_CONSENT_COOKIE)) {
				scopedEvent.cookies.set(LOGTO_CONSENT_COOKIE, '1', {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: scopedEvent.url.protocol === 'https:',
					maxAge: 60 * 60 * 24 * 365
				});
			}

			return resolve(scopedEvent);
		}
	});
}