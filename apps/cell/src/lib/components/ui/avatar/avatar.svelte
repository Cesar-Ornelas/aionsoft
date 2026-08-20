<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`relative flex shrink-0 overflow-hidden rounded-full ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
