<script>
  import { goto } from '$app/navigation';
  import * as Field from '$lib/components/ui/field';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let { data } = $props();

  let email = $state('');
  let password = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  async function signIn() {
    submitting = true;
    errorMessage = '';
    try {
      const response = await fetch('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      await goto(data.redirect);
    } catch (error) {
      errorMessage = error.message;
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Sign in | Aionsoft Cell</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12">
  <form class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm" onsubmit={(event) => { event.preventDefault(); signIn(); }}>
    <p class="text-sm font-medium text-muted-foreground">Aionsoft Cell</p>
    <h1 class="mt-2 text-2xl font-semibold text-foreground">Sign in</h1>
    <p class="mt-1 text-sm text-muted-foreground">Use your management account to continue.</p>
    <Field.FieldGroup class="mt-6">
      <Field.Field><Field.FieldLabel for="login-email">Email</Field.FieldLabel><Input id="login-email" type="email" autocomplete="email" bind:value={email} required /></Field.Field>
      <Field.Field><Field.FieldLabel for="login-password">Password</Field.FieldLabel><Input id="login-password" type="password" autocomplete="current-password" bind:value={password} required /></Field.Field>
    </Field.FieldGroup>
    {#if errorMessage}<p class="mt-4 text-sm text-destructive" role="alert">{errorMessage}</p>{/if}
    <Button class="mt-6 w-full" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</Button>
  </form>
</div>
