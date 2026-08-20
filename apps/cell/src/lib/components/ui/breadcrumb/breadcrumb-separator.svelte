<script>
  let { class: className = '', children, ...rest } = $props();
  const classes = $derived(`text-muted-foreground ${className}`.trim());
</script>

<li role="presentation" aria-hidden="true" class={classes} {...rest}>
  {#if children}
    {@render children()}
  {:else}
    /
  {/if}
</li>
