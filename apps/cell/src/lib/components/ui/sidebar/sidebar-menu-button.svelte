<script>
  let {
    class: className = '',
    isActive = false,
    size = 'default',
    children,
    ...rest
  } = $props();

  const sizeClass = $derived(size === 'lg' ? 'h-12 px-3' : 'h-9 px-2');
  const stateClass = $derived(isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground');
  const classes = $derived(`flex w-full items-center gap-2 rounded-md text-left text-sm transition-colors ${sizeClass} ${stateClass} ${className}`.trim());
</script>

<button class={classes} {...rest}>
  {@render children?.({ props: { class: classes } })}
</button>
