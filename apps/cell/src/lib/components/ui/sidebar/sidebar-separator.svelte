<script>
  let { class: className = '', ...rest } = $props();
  const classes = $derived(`my-1 h-px w-full bg-border ${className}`.trim());
</script>

<div class={classes} {...rest}></div>
