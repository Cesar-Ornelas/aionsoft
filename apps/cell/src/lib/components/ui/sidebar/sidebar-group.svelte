<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`space-y-2 ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
