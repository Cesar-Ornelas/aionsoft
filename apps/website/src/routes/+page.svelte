<script>
	import HeroSection from '$lib/components/HeroSection.svelte';
	import ServicesSection from '$lib/components/ServicesSection.svelte';
	import ProblemsSection from '$lib/components/ProblemsSection.svelte';
	import OurProcessSection from '$lib/components/OurProcessSection.svelte';
	import WebPacksSection from '$lib/components/WebPacksSection.svelte';
	import ContactSection from '$lib/components/ContactSection.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Aionsoft - Software, Websites & Business Systems</title>
	<meta name="description" content="We help small businesses modernize operations with custom software, websites, automations, hosting, reporting, and practical technology support." />
</svelte:head>

<HeroSection />
<ServicesSection />
<ProblemsSection />
<OurProcessSection />
<WebPacksSection />
<ContactSection form={form} timestamp={data.formTimestamp} />
