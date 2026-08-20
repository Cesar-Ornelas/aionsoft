<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
