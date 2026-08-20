<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5 ${className}`.trim());
</script>

<ol class={classes} {...rest}>
  {@render children?.()}
</ol>
