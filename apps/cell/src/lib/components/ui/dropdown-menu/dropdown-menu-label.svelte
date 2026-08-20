<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`px-2 py-1.5 text-sm font-semibold ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
