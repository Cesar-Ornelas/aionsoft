<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
