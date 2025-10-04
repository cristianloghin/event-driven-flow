import {
  ActionState,
  ChannelSchema,
  ComponentMetadata,
  EventMetadata,
  ListenerInfo,
  StringKey,
  SubscribeOptions,
  TypedChannel,
} from "../types";

export class EventManager {
  private events = new Map<string, Set<ListenerInfo>>();
  private componentRegistry = new Map<string, ComponentMetadata>();
  private listeners = new Map<
    string,
    { eventName: string; listenerInfo: ListenerInfo }
  >();
  private debugMode: boolean;
  private debugListeners = new Map();
  private lastPayloads = new Map<string, ActionState>();
  private rateLimiter = new Map<
    string,
    { count: number; windowStart: number }
  >();

  constructor(config: { debug?: boolean } = {}) {
    this.debugMode = config.debug || process.env.NODE_ENV === "development";
  }

  private log(
    method: "debug" | "info" | "error" | "warn",
    ...message: unknown[]
  ) {
    if (this.debugMode) {
      console[method](...message);
    }
  }

  // Component registration
  registerComponent(componentId: string, metadata: ComponentMetadata) {
    this.componentRegistry.set(componentId, metadata);
    this.log("debug", `📦 Component registered: ${componentId}`);
    this.notifyDebugger();
    return componentId;
  }

  unregisterComponent(componentId: string) {
    this.componentRegistry.delete(componentId);
    this.log("debug", `🗑️ Component unregistered: ${componentId}`);
    this.notifyDebugger();
  }

  // Channel subscription with advanced features
  subscribe<TSchema extends ChannelSchema, TAction extends StringKey<TSchema>>(
    eventName: string,
    callback: (
      payload: TSchema[TAction],
      eventMetadata?: EventMetadata
    ) => void,
    options: SubscribeOptions<TSchema, TAction> = {}
  ) {
    // Generate random listener ID
    const listenerId = Math.random().toString(36).substring(2, 15);

    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }

    const listenerInfo: ListenerInfo<TSchema, TAction> = {
      id: listenerId,
      callback,
      once: options.once || false,
      filter: options.filter,
      componentId: options.componentId,
    };

    this.events.get(eventName)?.add(listenerInfo as unknown as ListenerInfo);
    this.listeners.set(listenerId, {
      eventName,
      listenerInfo: listenerInfo as unknown as ListenerInfo,
    });

    this.log(
      "info",
      `🎧 Component ${
        options.componentId || "unknown"
      } subscribed to ${eventName}`
    );

    return listenerId;
  }

  unsubscribe(listenerId: string) {
    const listener = this.listeners.get(listenerId);
    if (listener) {
      const { eventName, listenerInfo } = listener;
      this.events.get(eventName)?.delete(listenerInfo);
      this.listeners.delete(listenerId);

      if (this.events.get(eventName)?.size === 0) {
        this.events.delete(eventName);
      }
    }
  }

  // Event emission with correlation tracking
  emit<TSchema extends ChannelSchema, TAction extends StringKey<TSchema>>(
    eventName: string,
    payload: TSchema[TAction],
    options: EventMetadata = {}
  ) {
    const event = this.events.get(eventName);
    if (!event) return;

    // Rate limiting check
    if (this.isRateLimited(eventName)) {
      return; // Drop the event if rate limited
    }

    // Generate correlation ID for loop detection
    const correlationId = this.generateCorrelationId(eventName);
    const ancestorIds = new Set(options.ancestorIds || []);

    // Loop detection
    if (ancestorIds.has(correlationId)) {
      this.log("warn", `🔄 Loop detected for ${eventName} - breaking chain`);
      return;
    }

    this.lastPayloads.set(eventName, payload as ActionState);

    const eventMetadata: EventMetadata = {
      eventName,
      timestamp: Date.now(),
      correlationId,
      ancestorIds: new Set([...ancestorIds, correlationId]),
      emitterId: options.emitterId,
      ...options,
    };

    this.log(
      "info",
      `📡 Event ${eventName} emitted by ${options.emitterId || "unknown"}:`,
      payload
    );

    const listenersToRemove: ListenerInfo<TSchema, TAction>[] = [];

    event.forEach((listenerInfo) => {
      const typedListener = listenerInfo as unknown as ListenerInfo<
        TSchema,
        TAction
      >;
      const { callback, once, filter } = typedListener;

      // Apply filter if provided
      if (filter && !filter(payload)) return;

      // Call the callback
      try {
        callback(payload, eventMetadata);
      } catch (error) {
        console.error(
          `Error in event listener for channel "${eventName}":`,
          error
        );
      }

      if (once) {
        listenersToRemove.push(typedListener);
      }
    });

    // Clean up one-time listeners
    listenersToRemove.forEach((listenerInfo) => {
      event.delete(listenerInfo as unknown as ListenerInfo);
      for (const [id, info] of this.listeners.entries()) {
        if (info.listenerInfo === (listenerInfo as unknown as ListenerInfo)) {
          this.listeners.delete(id);
          break;
        }
      }
    });
  }

  private isRateLimited(eventName: string): boolean {
    const now = Date.now();
    const window = 1000; // 1 second window
    const limit = 100; // max 100 events per second per event type

    let tracker = this.rateLimiter.get(eventName);

    // Reset window if expired
    if (!tracker || now - tracker.windowStart > window) {
      tracker = { count: 0, windowStart: now };
      this.rateLimiter.set(eventName, tracker);
    }

    tracker.count++;

    if (tracker.count > limit) {
      this.log(
        "warn",
        `⚠️ Rate limit exceeded for ${eventName}: ${tracker.count}/${limit} events per second`
      );

      return true;
    }

    return false;
  }

  generateCorrelationId(channelName: string) {
    const timestamp = performance.now();
    const random = Math.random().toString(36).substring(7);
    return `${channelName}_${timestamp}_${random}`;
  }

  // Debug utilities
  getEvents(cb: (events: string[]) => void): () => void {
    this.debugListeners.set("events", cb);
    cb(Array.from(this.events.keys()));
    return () => {
      this.debugListeners.delete("events");
    };
  }

  getEventListenerCount(eventName: string) {
    return this.events.get(eventName)?.size || 0;
  }

  getComponentRegistry(
    cb: (components: Array<ComponentMetadata & { id: string }>) => void
  ): () => void {
    this.debugListeners.set("componentRegistry", cb);

    cb(
      Array.from(this.componentRegistry.entries()).map(([id, info]) => ({
        id,
        ...info,
      }))
    );

    return () => {
      this.debugListeners.delete("componentRegistry");
    };
  }

  getLastPayload<
    TSchema extends ChannelSchema,
    TAction extends StringKey<TSchema>
  >(channel: TypedChannel<TSchema>, action: TAction) {
    const lastPayload = this.lastPayloads.get(`${channel.name}.${action}`);
    return lastPayload as TSchema[TAction] | undefined;
  }

  getPayloads(eventName: string) {
    const payloads: { [k: string]: ActionState } = {};
    this.lastPayloads.forEach((payload, key) => {
      if (key.startsWith(eventName)) {
        payloads[key] = payload;
      }
    });
    return payloads;
  }

  private notifyDebugger() {
    // Get the events callback and notify with current events
    const eventsCallback = this.debugListeners.get("events");
    if (eventsCallback) {
      eventsCallback(Array.from(this.events.keys()));
    }

    // Get the component registry callback and notify with transformed data
    const componentCallback = this.debugListeners.get("componentRegistry");
    if (componentCallback) {
      const transformedComponents = Array.from(
        this.componentRegistry.entries()
      ).map(([id, info]) => ({
        id,
        ...info,
      }));
      componentCallback(transformedComponents);
    }
  }

  cleanup = () => {
    this.log("info", "🧹 Cleaned up the event manager");
  };
}

// Global instance
export const globalEventManager = new EventManager();
export function cleanupEventManager() {
  return () => globalEventManager.cleanup();
}
