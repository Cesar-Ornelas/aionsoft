<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`font-normal text-foreground ${className}`.trim());
</script>

<span class={classes} aria-current="page" {...rest}>
  {@render children?.()}
</span>
