<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { TagsInputProps } from './types';
	import TagsInputTag from './tags-input-tag.svelte';
	import TagsInputSuggestion from './tags-input-suggestion.svelte';
	import { untrack } from 'svelte';

	const defaultValidate: TagsInputProps['validate'] = (val, tags) => {
		const transformed = val.trim();

		if (transformed.length === 0) return undefined;
		if (tags.find((tag) => transformed === tag)) return undefined;

		return transformed;
	};

	const defaultFilter: NonNullable<TagsInputProps['filterSuggestions']> = (inputValue, suggestions) => {
		const lower = inputValue.toLowerCase();
		return suggestions.filter((suggestion) => suggestion.toLowerCase().includes(lower));
	};

	let {
		value = $bindable([]),
		placeholder,
		class: className,
		disabled = false,
		validate = defaultValidate,
		onValueChange,
		suggestions,
		filterSuggestions = defaultFilter,
		restrictToSuggestions = false,
		...rest
	}: TagsInputProps = $props();

	let inputValue = $state('');
	let tagIndex = $state<number>();
	let invalid = $state(false);
	let isComposing = $state(false);
	let inputFocused = $state(false);
	let suggestionIndex = $state<number>();
	let listboxId = $props.id();
	let listboxEl = $state<HTMLElement>();

	$effect(() => {
		if (suggestionIndex !== undefined && listboxEl) {
			const item = listboxEl.querySelector(`#${CSS.escape(listboxId)}-${suggestionIndex}`);
			item?.scrollIntoView({ block: 'nearest' });
		}
	});

	const filteredSuggestions = $derived.by(() => {
		if (!suggestions) return [];

		const available = suggestions.filter((suggestion) => !value.includes(suggestion));

		if (inputValue.length === 0) return available;

		return filterSuggestions(inputValue, available);
	});

	const showSuggestions = $derived(inputFocused && filteredSuggestions.length > 0 && tagIndex === undefined);

	$effect(() => {
		filteredSuggestions;

		untrack(() => {
			suggestionIndex = filteredSuggestions.length > 0 ? 0 : undefined;
		});
	});

	$effect(() => {
		inputValue;

		untrack(() => {
			invalid = false;
		});
	});

	const selectSuggestion = (val: string) => {
		const validated = validate(val, value);

		if (!validated) return;

		value = [...value, validated];
		onValueChange?.(value);
		inputValue = '';
		suggestionIndex = undefined;
	};

	const enter = () => {
		if (isComposing) return;

		if (showSuggestions && suggestionIndex !== undefined) {
			selectSuggestion(filteredSuggestions[suggestionIndex]);
			return;
		}

		if (restrictToSuggestions && suggestions) {
			const match = suggestions.find((suggestion) => suggestion.toLowerCase() === inputValue.trim().toLowerCase());

			if (!match) {
				invalid = true;
				return;
			}

			selectSuggestion(match);
			return;
		}

		const validated = validate(inputValue, value);

		if (!validated) {
			invalid = true;
			return;
		}

		value = [...value, validated];
		onValueChange?.(value);
		inputValue = '';
	};

	const compositionStart = () => {
		isComposing = true;
	};

	const compositionEnd = () => {
		isComposing = false;
	};

	const keydown = (e: KeyboardEvent) => {
		const target = e.target as HTMLInputElement;

		if (e.key === 'Escape') {
			if (showSuggestions) {
				suggestionIndex = undefined;
				inputFocused = false;
				target.blur();
				return;
			}
		}

		if (showSuggestions) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();

				if (suggestionIndex === undefined) {
					suggestionIndex = 0;
				} else {
					suggestionIndex = (suggestionIndex + 1) % filteredSuggestions.length;
				}

				return;
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault();

				if (suggestionIndex === undefined) {
					suggestionIndex = filteredSuggestions.length - 1;
				} else {
					suggestionIndex = (suggestionIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length;
				}

				return;
			}
		}

		if (e.key === 'Enter') {
			e.preventDefault();

			if (isComposing) return;

			if (tagIndex !== undefined) {
				deleteIndex(tagIndex);
				const prev = tagIndex - 1;
				tagIndex = prev < 0 ? undefined : prev;
				return;
			}

			enter();
			return;
		}

		const isAtBeginning = target.selectionStart === 0 && target.selectionEnd === 0;
		let shouldResetIndex = true;

		if (e.key === 'Backspace') {
			if (isAtBeginning) {
				e.preventDefault();

				if (tagIndex !== undefined) {
					deleteIndex(tagIndex);
					const prev = tagIndex - 1;

					if (prev < 0) {
						tagIndex = undefined;
					} else {
						tagIndex = prev;
					}
				} else {
					tagIndex = value.length - 1;
				}

				shouldResetIndex = false;
			}
		}

		if (e.key === 'Delete') {
			if (isAtBeginning && inputValue.length === 0 && tagIndex !== undefined) {
				e.preventDefault();
				deleteIndex(tagIndex);
				if (value.length === 0) tagIndex = undefined;
				shouldResetIndex = false;
			}
		}

		if (isAtBeginning) {
			if (e.key === 'ArrowLeft') {
				if (tagIndex !== undefined) {
					const prev = tagIndex - 1;
					tagIndex = prev < 0 ? 0 : prev;
				} else {
					tagIndex = value.length - 1;
				}

				shouldResetIndex = false;
			}

			if (inputValue.length === 0 && e.key === 'ArrowRight' && tagIndex !== undefined) {
				const next = tagIndex + 1;
				tagIndex = next > value.length - 1 ? undefined : next;
				shouldResetIndex = false;
			}
		}

		if (shouldResetIndex) {
			tagIndex = undefined;
		}
	};

	const deleteValue = (val: string) => {
		const index = value.findIndex((item) => val === item);

		if (index === -1) return;

		deleteIndex(index);
	};

	const deleteIndex = (index: number) => {
		value = [...value.slice(0, index), ...value.slice(index + 1)];
		onValueChange?.(value);
	};

	const blur = () => {
		tagIndex = undefined;
		setTimeout(() => {
			inputFocused = false;
		}, 150);
	};

	const focus = () => {
		inputFocused = true;
	};
</script>

<div
	class={cn(
		'border-input bg-background selection:bg-primary dark:bg-input/30 relative flex min-h-[36px] w-full flex-wrap place-items-center gap-1 rounded-md border py-0.5 pr-1 pl-1 disabled:opacity-50 aria-disabled:cursor-not-allowed',
		className
	)}
	aria-disabled={disabled}
>
	{#each value as tag, i (tag)}
		<TagsInputTag value={tag} {disabled} onDelete={deleteValue} active={i === tagIndex} />
	{/each}
	<input
		{...rest}
		bind:value={inputValue}
		onblur={blur}
		onfocus={focus}
		oncompositionstart={compositionStart}
		oncompositionend={compositionEnd}
		{disabled}
		{placeholder}
		data-invalid={invalid}
		onkeydown={keydown}
		role={suggestions ? 'combobox' : undefined}
		aria-expanded={suggestions ? showSuggestions : undefined}
		aria-autocomplete={suggestions ? 'list' : undefined}
		aria-controls={suggestions ? listboxId : undefined}
		aria-activedescendant={suggestionIndex !== undefined ? `${listboxId}-${suggestionIndex}` : undefined}
		class="placeholder:text-muted-foreground min-w-16 shrink grow basis-0 border-none bg-transparent px-2 outline-hidden focus:outline-hidden disabled:cursor-not-allowed data-[invalid=true]:text-red-500 md:text-sm"
	/>
	{#if showSuggestions}
		<div
			bind:this={listboxEl}
			id={listboxId}
			role="listbox"
			class="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-50 mt-1 max-h-50 overflow-y-auto rounded-md border p-1 shadow-md"
		>
			{#each filteredSuggestions as suggestion, i (suggestion)}
				<TagsInputSuggestion
					id={`${listboxId}-${i}`}
					value={suggestion}
					active={i === suggestionIndex}
					onSelect={selectSuggestion}
				/>
			{/each}
		</div>
	{/if}
</div>