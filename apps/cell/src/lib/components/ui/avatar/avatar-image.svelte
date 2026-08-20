<script>
  let { src = '', alt = '', class: className = '', ...rest } = $props();
  const classes = $derived(`aspect-square h-full w-full object-cover ${className}`.trim());
</script>

<img {src} {alt} class={classes} {...rest} />
