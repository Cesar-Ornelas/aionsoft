<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
	const swetrixProjectId = env.PUBLIC_SWETRIX_PROJECT_ID ?? '';
	const swetrixApiUrl = env.PUBLIC_SWETRIX_API_URL ?? '';

	const hasSwetrixConfig = Boolean(swetrixProjectId && swetrixApiUrl);
	const swetrixNoscriptUrl = hasSwetrixConfig
		? `${swetrixApiUrl.replace(/\/v1\/log\/?$/, '/log/noscript')}?pid=${swetrixProjectId}`
		: '';

	function initSwetrix() {
		if (!hasSwetrixConfig || typeof window === 'undefined' || !window.swetrix) {
			return;
		}

		if (document.documentElement.dataset.swetrixInitialized === 'true') {
			return;
		}

		window.swetrix.init(swetrixProjectId, {
			apiURL: swetrixApiUrl
		});
		window.swetrix.trackViews();
		document.documentElement.dataset.swetrixInitialized = 'true';
	}

	onMount(() => {
		if (!hasSwetrixConfig) {
			return;
		}

		if (window.swetrix) {
			initSwetrix();
			return;
		}

		const existingScript = document.querySelector('script[data-swetrix-loader="true"]');

		if (existingScript) {
			existingScript.addEventListener('load', initSwetrix, { once: true });
			return () => existingScript.removeEventListener('load', initSwetrix);
		}

		const script = document.createElement('script');
		script.src = 'https://swetrix.org/swetrix.js';
		script.defer = true;
		script.dataset.swetrixLoader = 'true';
		script.addEventListener('load', initSwetrix, { once: true });
		document.head.append(script);

		return () => script.removeEventListener('load', initSwetrix);
	});
</script>

{#if hasSwetrixConfig}
	<noscript>
		<img
			src={swetrixNoscriptUrl}
			alt=""
			referrerpolicy="no-referrer-when-downgrade"
		/>
	</noscript>
{/if}

<Header />

<div class="flex flex-col">
	{@render children()}
	<Footer />
</div>
