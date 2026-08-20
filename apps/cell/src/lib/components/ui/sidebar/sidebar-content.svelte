<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
