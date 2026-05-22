import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { Resend } from 'resend';

const MIN_FORM_AGE_MS = 3_000;
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 12;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getTrimmedString(formData, key) {
	return String(formData.get(key) ?? '').trim();
}

function validate(values) {
	const errors = {};

	if (!values.name) {
		errors.name = 'Please enter your name.';
	}

	if (!values.email) {
		errors.email = 'Please enter your email address.';
	} else if (!emailPattern.test(values.email)) {
		errors.email = 'Please enter a valid email address.';
	}

	if (!values.helpType || values.helpType === 'What do you need help with?') {
		errors.helpType = 'Please select what you need help with.';
	}

	if (!values.details) {
		errors.details = 'Please tell us about your project.';
	}

	return errors;
}

export function load() {
	return {
		formTimestamp: Date.now()
	};
}

export const actions = {
	default: async ({ request, getClientAddress }) => {
		const formData = await request.formData();
		const values = {
			name: getTrimmedString(formData, 'name'),
			email: getTrimmedString(formData, 'email'),
			helpType: getTrimmedString(formData, 'helpType'),
			details: getTrimmedString(formData, 'details')
		};

		const honeypot = getTrimmedString(formData, 'website');
		const timestampRaw = getTrimmedString(formData, 'timestamp');
		const timestamp = Number(timestampRaw);

		if (honeypot) {
			return fail(400, {
				error: 'Unable to submit the form.',
				values
			});
		}

		if (!timestampRaw || Number.isNaN(timestamp)) {
			return fail(400, {
				error: 'This form session is invalid. Please refresh and try again.',
				values
			});
		}

		const formAge = Date.now() - timestamp;

		if (formAge < MIN_FORM_AGE_MS) {
			return fail(400, {
				error: 'Please take a moment to review your message before submitting.',
				values
			});
		}

		if (formAge > MAX_FORM_AGE_MS) {
			return fail(400, {
				error: 'This form has expired. Please refresh the page and try again.',
				values
			});
		}

		const errors = validate(values);

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values
			});
		}

		if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
			return fail(500, {
				error: 'Email delivery is not configured yet. Please try again later.',
				values
			});
		}

		const resend = new Resend(env.RESEND_API_KEY);

		try {
			await resend.emails.send({
				from: env.CONTACT_FROM_EMAIL,
				to: env.CONTACT_TO_EMAIL,
				replyTo: values.email,
				subject: `Aionsoft contact form: ${values.helpType}`,
				text: [
					`Name: ${values.name}`,
					`Email: ${values.email}`,
					`Help type: ${values.helpType}`,
					`Submitted from IP: ${getClientAddress()}`,
					'',
					'Details:',
					values.details
				].join('\n'),
				html: `
					<h1>New Aionsoft contact request</h1>
					<p><strong>Name:</strong> ${values.name}</p>
					<p><strong>Email:</strong> ${values.email}</p>
					<p><strong>Help type:</strong> ${values.helpType}</p>
					<p><strong>Submitted from IP:</strong> ${getClientAddress()}</p>
					<p><strong>Details:</strong></p>
					<p>${values.details.replace(/\n/g, '<br>')}</p>
				`
			});

			return {
				success: true,
				message: 'Thanks. Your message has been sent and we will get back to you soon.'
			};
		} catch (error) {
			console.error('Failed to send contact form email', error);
			return fail(500, {
				error: 'We could not send your message right now. Please try again shortly.',
				values
			});
		}
	}
};