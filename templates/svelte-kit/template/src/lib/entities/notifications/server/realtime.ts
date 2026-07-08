import { env } from "$env/dynamic/private";
import postgres from "postgres";

const NOTIFICATIONS_CHANNEL = "app_notifications";

type NotificationRealtimeSubscriber = {
  userId: string;
  onEvent: (event: NotificationRealtimeEvent) => void;
};

type NotificationRealtimeState = {
  notifyClient?: ReturnType<typeof postgres>;
  listenClient?: ReturnType<typeof postgres>;
  listenerReady?: Promise<void>;
  subscribers: Map<string, NotificationRealtimeSubscriber>;
};

const globalStateKey = "__aionsoft_template_notifications_realtime__";

const state =
  ((globalThis as Record<string, unknown>)[globalStateKey] as NotificationRealtimeState | undefined) ??
  {
    subscribers: new Map<string, NotificationRealtimeSubscriber>()
  };

(globalThis as Record<string, unknown>)[globalStateKey] = state;

export type NotificationRealtimeEventType = "created" | "read" | "readAll" | "deleted";

export type NotificationRealtimeEvent = {
  id: string;
  type: NotificationRealtimeEventType;
  notificationId: string | null;
  recipientScope: "global" | "user";
  recipientUserId: string | null;
  createdAt: string;
};

type EmitNotificationRealtimeEventInput = {
  type: NotificationRealtimeEventType;
  notificationId?: string | null;
  recipientScope: "global" | "user";
  recipientUserId?: string | null;
};

function getDatabaseUrl() {
  const value = env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error("Missing required DATABASE_URL environment variable.");
  }

  return value;
}

function createEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldDeliverEvent(userId: string, event: NotificationRealtimeEvent) {
  if (event.recipientScope === "global") {
    return true;
  }

  return event.recipientUserId === userId;
}

function notifySubscribers(event: NotificationRealtimeEvent) {
  for (const subscriber of state.subscribers.values()) {
    if (shouldDeliverEvent(subscriber.userId, event)) {
      subscriber.onEvent(event);
    }
  }
}

function parseRealtimeEvent(rawPayload: string) {
  try {
    const payload = JSON.parse(rawPayload) as NotificationRealtimeEvent;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    if (payload.recipientScope !== "global" && payload.recipientScope !== "user") {
      return null;
    }

    if (!payload.id || !payload.type || !payload.createdAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function getNotifyClient() {
  if (!state.notifyClient) {
    state.notifyClient = postgres(getDatabaseUrl(), {
      prepare: false,
      max: 1
    });
  }

  return state.notifyClient;
}

async function ensureListenerStarted() {
  if (!state.listenerReady) {
    state.listenerReady = (async () => {
      state.listenClient = postgres(getDatabaseUrl(), {
        prepare: false,
        max: 1
      });

      await state.listenClient.listen(NOTIFICATIONS_CHANNEL, (payload) => {
        const event = parseRealtimeEvent(payload);

        if (event) {
          notifySubscribers(event);
        }
      });
    })().catch((error) => {
      state.listenerReady = undefined;
      throw error;
    });
  }

  await state.listenerReady;
}

function buildRealtimeEvent(input: EmitNotificationRealtimeEventInput): NotificationRealtimeEvent {
  return {
    id: createEventId(),
    type: input.type,
    notificationId: input.notificationId ?? null,
    recipientScope: input.recipientScope,
    recipientUserId: input.recipientScope === "user" ? input.recipientUserId ?? null : null,
    createdAt: new Date().toISOString()
  };
}

export async function emitNotificationRealtimeEvent(input: EmitNotificationRealtimeEventInput) {
  const event = buildRealtimeEvent(input);

  try {
    const client = await getNotifyClient();
    await client.notify(NOTIFICATIONS_CHANNEL, JSON.stringify(event));
  } catch {
    // Ignore realtime failures so notification persistence is not blocked.
  }
}

export async function subscribeToNotificationEventsForUser(
  userId: string,
  onEvent: (event: NotificationRealtimeEvent) => void
) {
  await ensureListenerStarted();

  const subscriberId = createEventId();
  state.subscribers.set(subscriberId, { userId, onEvent });

  return () => {
    state.subscribers.delete(subscriberId);
  };
}
