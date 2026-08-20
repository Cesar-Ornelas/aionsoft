<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`list-none ${className}`.trim());
</script>

<li class={classes} {...rest}>
  {@render children?.()}
</li>
