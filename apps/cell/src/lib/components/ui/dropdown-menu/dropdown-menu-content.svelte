<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
