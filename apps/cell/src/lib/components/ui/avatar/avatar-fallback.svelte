<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
