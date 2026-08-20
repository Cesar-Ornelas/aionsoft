<script>
  let { children, ...rest } = $props();
</script>

<nav aria-label="Breadcrumb" {...rest}>
  {@render children?.()}
</nav>
