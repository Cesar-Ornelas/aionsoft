<script module>
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    link: 'text-primary underline-offset-4 hover:underline'
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  };

  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  export { variants, sizes, base };
</script>

<script>
  let {
    class: className = '',
    variant = 'default',
    size = 'default',
    children,
    ...rest
  } = $props();

  const variantClass = $derived(variants[variant] ?? variants.default);
  const sizeClass = $derived(sizes[size] ?? sizes.default);
  const computedClass = $derived(`${base} ${variantClass} ${sizeClass} ${className}`.trim());
</script>

<button class={computedClass} {...rest}>
  {@render children?.()}
</button>
