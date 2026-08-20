<script>
  let { class: className = '', ...rest } = $props();
  const classes = $derived(`-mx-1 my-1 h-px bg-muted ${className}`.trim());
</script>

<div class={classes} {...rest}></div>
