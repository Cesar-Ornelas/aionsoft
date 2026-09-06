<script>
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	} = $props();
</script>

<CalendarPrimitive.Cell
	bind:ref
	class={cn(
		"relative flex h-(--cell-size) w-full items-center justify-center p-0 text-center focus-within:z-20 [&[data-selected]_[data-bits-day]]:bg-primary [&[data-selected]_[data-bits-day]]:text-primary-foreground [&[data-selected]_[data-bits-day]]:hover:text-foreground [&[aria-selected=true]_[data-bits-day]]:bg-primary [&[aria-selected=true]_[data-bits-day]]:text-primary-foreground [&:first-child[data-selected]_[data-bits-day]]:rounded-s-(--cell-radius) [&:last-child[data-selected]_[data-bits-day]]:rounded-e-(--cell-radius)",
		className
	)}
	{...restProps}
/>