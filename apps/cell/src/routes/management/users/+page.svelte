<div class="space-y-6">
  <div class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Management</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Users</h1>
    </div>
    <button type="button" class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Add user</button>
  </div>

  <div class="overflow-hidden rounded-2xl border border-border bg-card">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-border bg-muted/30 text-muted-foreground">
        <tr>
          <th class="px-4 py-3 font-medium">Name</th>
          <th class="px-4 py-3 font-medium">Email</th>
          <th class="px-4 py-3 font-medium">Group</th>
          <th class="px-4 py-3 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b border-border last:border-b-0">
          <td class="px-4 py-3 font-medium text-foreground">Aionsoft Admin</td>
          <td class="px-4 py-3 text-muted-foreground">admin@aionsoft.local</td>
          <td class="px-4 py-3 text-muted-foreground">Administrators</td>
          <td class="px-4 py-3"><span class="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-500">Active</span></td>
        </tr>
        <tr class="border-b border-border last:border-b-0">
          <td class="px-4 py-3 font-medium text-foreground">Nadia Stone</td>
          <td class="px-4 py-3 text-muted-foreground">nadia@aionsoft.local</td>
          <td class="px-4 py-3 text-muted-foreground">Operations</td>
          <td class="px-4 py-3"><span class="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-500">Pending</span></td>
        </tr>
        <tr class="border-b border-border last:border-b-0">
          <td class="px-4 py-3 font-medium text-foreground">Diego Torres</td>
          <td class="px-4 py-3 text-muted-foreground">diego@aionsoft.local</td>
          <td class="px-4 py-3 text-muted-foreground">Sales</td>
          <td class="px-4 py-3"><span class="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-500">Active</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
