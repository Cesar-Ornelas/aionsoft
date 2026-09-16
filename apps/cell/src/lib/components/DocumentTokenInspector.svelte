<script>
  import BoldIcon from '@lucide/svelte/icons/bold';
  import ItalicIcon from '@lucide/svelte/icons/italic';
  import UnderlineIcon from '@lucide/svelte/icons/underline';
  import StrikethroughIcon from '@lucide/svelte/icons/strikethrough';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { PARAGRAPH_LINE_HEIGHTS, TOKEN_COLORS, TOKEN_FONT_SIZES } from '$lib/documents/model/token-style.js';

  let { token = null, onChange = null, onAlign = null, onLineHeight = null, onReset = null } = $props();
  const alignments = [
    { key: 'left', label: 'Left' },
    { key: 'center', label: 'Center' },
    { key: 'right', label: 'Right' },
    { key: 'justify', label: 'Justify' }
  ];
</script>

<section class="rounded-xl border border-border bg-muted/20 p-5">
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected token</p>
      {#if token}<p class="mt-2 font-medium text-foreground">{token.type === 'image' ? token.attrs.alt || token.attrs.resourceKey : `${token.type === 'documentField' ? '@' : '#'}${token.attrs.label || token.attrs.fieldKey || token.attrs.variableKey}`}</p>{/if}
    </div>
    {#if token}<button type="button" class="inspector-reset" title="Reset token properties" aria-label="Reset token properties" onclick={() => onReset?.()}><RotateCcwIcon size={15} /></button>{/if}
  </div>

  {#if token}
    <div class="mt-4 grid gap-4">
      {#if token.type === 'image'}
        <label class="inspector-label">Width (px)
          <input class="dimension-input" type="number" min="1" max="4000" step="1" value={token.attrs.widthPx || ''} placeholder="Auto" onchange={(event) => onChange?.({ widthPx: event.currentTarget.value ? Number(event.currentTarget.value) : null, width: null })} />
        </label>
        <label class="inspector-label">Height (px)
          <input class="dimension-input" type="number" min="1" max="4000" step="1" value={token.attrs.heightPx || ''} placeholder="Auto" onchange={(event) => onChange?.({ heightPx: event.currentTarget.value ? Number(event.currentTarget.value) : null })} />
        </label>
      {:else}
      <div class="inspector-label">Text style
        <div class="style-toggle-group" role="group" aria-label="Text style">
          <button type="button" class:active={token.attrs.bold} aria-label="Bold" title="Bold" aria-pressed={token.attrs.bold} onmousedown={(event) => event.preventDefault()} onclick={() => onChange?.({ bold: !token.attrs.bold })}><BoldIcon size={15} /></button>
          <button type="button" class:active={token.attrs.italic} aria-label="Italic" title="Italic" aria-pressed={token.attrs.italic} onmousedown={(event) => event.preventDefault()} onclick={() => onChange?.({ italic: !token.attrs.italic })}><ItalicIcon size={15} /></button>
          <button type="button" class:active={token.attrs.underline} aria-label="Underline" title="Underline" aria-pressed={token.attrs.underline} onmousedown={(event) => event.preventDefault()} onclick={() => onChange?.({ underline: !token.attrs.underline })}><UnderlineIcon size={15} /></button>
          <button type="button" class:active={token.attrs.strike} aria-label="Strikethrough" title="Strikethrough" aria-pressed={token.attrs.strike} onmousedown={(event) => event.preventDefault()} onclick={() => onChange?.({ strike: !token.attrs.strike })}><StrikethroughIcon size={15} /></button>
        </div>
      </div>
      <label class="inspector-label">Font size
        <select value={token.attrs.fontSize || ''} onchange={(event) => onChange?.({ fontSize: event.currentTarget.value || null })}>
          <option value="">Default</option>
          {#each TOKEN_FONT_SIZES as size}<option value={size}>{size}</option>{/each}
        </select>
      </label>
      <div class="inspector-label">Text color
        <div class="swatch-row">
          <button type="button" class="swatch clear" class:active={!token.attrs.textColor} aria-label="Default text color" title="Default text color" onclick={() => onChange?.({ textColor: null })}></button>
          {#each Object.entries(TOKEN_COLORS) as [key, color]}<button type="button" class="swatch" class:active={token.attrs.textColor === key} style={`background-color:${color}`} aria-label={`${key} text color`} title={`${key} text color`} onclick={() => onChange?.({ textColor: key })}></button>{/each}
        </div>
      </div>
      <div class="inspector-label">Background
        <div class="swatch-row">
          <button type="button" class="swatch clear" class:active={!token.attrs.backgroundColor} aria-label="No background color" title="No background color" onclick={() => onChange?.({ backgroundColor: null })}></button>
          {#each Object.entries(TOKEN_COLORS) as [key, color]}<button type="button" class="swatch" class:active={token.attrs.backgroundColor === key} style={`background-color:${color}`} aria-label={`${key} background`} title={`${key} background`} onclick={() => onChange?.({ backgroundColor: key })}></button>{/each}
        </div>
      </div>
      <div class="inspector-label">Paragraph alignment
        <div class="alignment-row">
          {#each alignments as alignment}<button type="button" class:active={token.alignment === alignment.key} aria-label={`Align ${alignment.label.toLowerCase()}`} title={`Align ${alignment.label.toLowerCase()}`} onclick={() => onAlign?.(alignment.key)}>{alignment.label}</button>{/each}
        </div>
      </div>
      <label class="inspector-label">Line height
        <select value={token.lineHeight || ''} onchange={(event) => onLineHeight?.(event.currentTarget.value || null)}>
          <option value="">Default</option>
          {#each PARAGRAPH_LINE_HEIGHTS as lineHeight}<option value={lineHeight}>{lineHeight === '0.75' ? 'Extra tight (0.75)' : lineHeight === '1' ? 'Tight (1.0)' : lineHeight}</option>{/each}
        </select>
      </label>
      {/if}
    </div>
  {:else}
    <p class="mt-3 text-sm text-muted-foreground">Click a field or variable in the canvas to edit its properties.</p>
  {/if}
</section>

<style>
  .inspector-reset { display: inline-flex; height: 1.75rem; width: 1.75rem; align-items: center; justify-content: center; border-radius: 0.375rem; color: var(--muted-foreground); }
  .inspector-reset:hover { background: var(--accent); color: var(--accent-foreground); }
  .inspector-label { display: grid; gap: 0.35rem; color: var(--muted-foreground); font-size: 0.75rem; font-weight: 650; }
  .inspector-label select, .dimension-input { min-height: 2rem; border: 1px solid var(--input); border-radius: 0.375rem; background: var(--background); padding: 0 0.5rem; color: var(--foreground); font-size: 0.8rem; }
  .swatch-row, .alignment-row, .style-toggle-group { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .style-toggle-group button { display: inline-flex; height: 2rem; width: 2rem; align-items: center; justify-content: center; border: 1px solid var(--input); border-radius: 0.375rem; color: var(--muted-foreground); }
  .style-toggle-group button.active, .style-toggle-group button:hover { background: var(--accent); color: var(--accent-foreground); }
  .swatch { height: 1.35rem; width: 1.35rem; border: 1px solid color-mix(in oklch, var(--foreground) 18%, var(--border)); border-radius: 999px; box-shadow: 0 0 0 1px transparent; }
  .swatch.active { box-shadow: 0 0 0 2px var(--background), 0 0 0 3px var(--primary); }
  .swatch.clear { background: linear-gradient(135deg, transparent 46%, var(--destructive) 47%, var(--destructive) 53%, transparent 54%); }
  .alignment-row button { border: 1px solid var(--input); border-radius: 0.375rem; padding: 0.35rem 0.5rem; color: var(--muted-foreground); font-size: 0.7rem; }
  .alignment-row button.active, .alignment-row button:hover { background: var(--accent); color: var(--accent-foreground); }
</style>