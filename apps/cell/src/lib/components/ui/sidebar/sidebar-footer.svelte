<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`mt-auto border-t bg-sidebar p-2 ${className}`.trim());
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
