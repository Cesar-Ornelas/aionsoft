import { subscribeToNotificationEventsForUser } from "$lib/entities/notifications";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

const encoder = new TextEncoder();

function createSseEvent(options: { event: string; data: unknown; id?: string }) {
  const lines = [];

  if (options.id) {
    lines.push(`id: ${options.id}`);
  }

  lines.push(`event: ${options.event}`);
  lines.push(`data: ${JSON.stringify(options.data)}`);

  return `${lines.join("\n")}\n\n`;
}

export const GET = async (event) => {
  const currentUser = await requireCurrentRequestUser(event);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (payload: string) => {
          controller.enqueue(encoder.encode(payload));
        };

        send(createSseEvent({ event: "ready", data: { ok: true } }));

        const heartbeat = setInterval(() => {
          send(createSseEvent({ event: "ping", data: { at: Date.now() } }));
        }, 25000);

        const unsubscribe = await subscribeToNotificationEventsForUser(currentUser.id, (payload) => {
          send(createSseEvent({ event: "notification", id: payload.id, data: payload }));
        });

        let closed = false;

        const cleanup = () => {
          if (closed) {
            return;
          }

          closed = true;
          clearInterval(heartbeat);
          unsubscribe();

          try {
            controller.close();
          } catch {
            // Ignore close errors when stream is already closed.
          }
        };

        event.request.signal.addEventListener("abort", cleanup, { once: true });
      }
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    }
  );
};
