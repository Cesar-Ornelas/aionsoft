<div class="space-y-6">
  <div class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Management</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Roles</h1>
    </div>
    <button type="button" class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create role</button>
  </div>

  <div class="space-y-4">
    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-foreground">Full access</h2>
          <p class="mt-1 text-sm text-muted-foreground">key: full_access</p>
        </div>
        <span class="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-500">Assigned</span>
      </div>
      <p class="mt-4 text-sm text-muted-foreground">Permissions: all modules, user management, migrations, and configuration.</p>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-foreground">Operations editor</h2>
          <p class="mt-1 text-sm text-muted-foreground">key: operations_editor</p>
        </div>
        <span class="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-500">Group scoped</span>
      </div>
      <p class="mt-4 text-sm text-muted-foreground">Permissions: queue updates, tasks, and incident handling for the operations workspace.</p>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-foreground">Viewer</h2>
          <p class="mt-1 text-sm text-muted-foreground">key: viewer</p>
        </div>
        <span class="rounded-full bg-slate-500/15 px-2 py-1 text-xs font-medium text-slate-400">Read only</span>
      </div>
      <p class="mt-4 text-sm text-muted-foreground">Permissions: read-only access for reporting and dashboards.</p>
    </div>
  </div>
</div>
