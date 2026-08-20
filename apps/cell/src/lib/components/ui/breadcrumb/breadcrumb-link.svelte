<script>
  let { href = '#', class: className = '', children, ...rest } = $props();
  const classes = $derived(`transition-colors hover:text-foreground ${className}`.trim());
</script>

<a {href} class={classes} {...rest}>
  {@render children?.()}
</a>
