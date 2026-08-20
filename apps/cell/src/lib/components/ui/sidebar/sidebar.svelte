<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`flex h-full w-full flex-col border-r bg-sidebar text-sidebar-foreground ${className}`.trim());
</script>

<aside class={classes} {...rest}>
  {@render children?.()}
</aside>
