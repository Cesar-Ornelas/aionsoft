<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`flex items-center justify-between gap-2 px-2 py-3 ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
