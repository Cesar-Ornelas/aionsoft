<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`space-y-1 ${className}`.trim());
</script>

<ul class={classes} {...rest}>
  {@render children?.()}
</ul>
