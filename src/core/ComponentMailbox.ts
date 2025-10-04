import { globalEventManager } from "./EventManager";
import {
  ActionState,
  ChannelSchema,
  ComponentMailboxInterface,
  EventMetadata,
  StringKey,
  TypedChannel,
} from "../types";

export class ComponentMailbox {
  private componentId: string;
  private subscriptions = new Set<string>();
  private destroyed = false;
  private registered = false;

  constructor(
    private name: string,
    private metadata: Record<string, any> = {}
  ) {
    this.componentId = crypto.randomUUID();
    console.info(
      `🌋 Created mailbox for component: ${this.name} with id: ${this.componentId}`
    );
  }

  init = (signal: AbortSignal) => {
    if (signal.aborted) {
      throw new Error("Signal already aborted");
    }
    signal.addEventListener("abort", this.destroy, { once: true });

    if (!this.registered) {
      globalEventManager.registerComponent(this.componentId, {
        name: this.name,
        registeredAt: Date.now(),
        ...this.metadata,
      });
      this.registered = true;
      this.destroyed = false;
    }

    console.info(
      `🚀 Initialized mailbox for: ${this.name} with id: ${this.componentId}`
    );
  };

  // Basic message sending
  tell<TSchema extends ChannelSchema, TAction extends StringKey<TSchema>>(
    channel: TypedChannel<TSchema>,
    action: TAction,
    payload: TSchema[TAction]
  ): void {
    channel.emit(action, payload, {
      emitterId: this.componentId,
    });
  }

  // Request-reply pattern
  ask<
    TSchema extends ChannelSchema,
    TAction extends StringKey<TSchema>,
    TResponse extends ActionState = ActionState
  >(
    channel: TypedChannel<TSchema>,
    action: TAction,
    payload: TSchema[TAction],
    timeout: number = 5000
  ): Promise<TResponse> {
    const correlationId = `${this.componentId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
    const replyChannel = `__reply_${correlationId}`;

    return new Promise<TResponse>((resolve, reject) => {
      let listenerId: string;

      // Listen for response
      const cleanup = () => {
        clearTimeout(timeoutId);
        if (listenerId) {
          globalEventManager.unsubscribe(listenerId);
        }
      };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Request timeout after ${timeout}ms for ${channel.name}.${action}`
          )
        );
      }, timeout);

      listenerId = globalEventManager.subscribe(
        replyChannel,
        (response) => {
          cleanup();
          resolve(response as TResponse);
        },
        {
          componentId: this.componentId,
          once: true,
        }
      );

      // Send request with reply information
      channel.emit(action, payload as TSchema[TAction], {
        emitterId: this.componentId,
        replyTo: replyChannel,
        correlationId: correlationId,
      });
    });
  }

  // Reply to an ask() request
  reply<TResponse extends ActionState>(
    replyTo: string,
    response: TResponse
  ): void {
    globalEventManager.emit(replyTo, response, {
      emitterId: this.componentId,
    });
  }

  // Message handling
  receive<TSchema extends ChannelSchema, TAction extends StringKey<TSchema>>(
    channel: TypedChannel<TSchema>,
    action: TAction,
    handler: (payload: TSchema[TAction], metadata: EventMetadata) => void
  ): () => void {
    const listenerId = channel.subscribe(
      action,
      (payload, eventMetadata) => {
        // Ignore own messages
        if (eventMetadata.emitterId === this.componentId) {
          return;
        }
        handler(payload, eventMetadata);
      },
      {
        componentId: this.componentId,
      }
    );

    this.subscriptions.add(listenerId);
    return () => globalEventManager.unsubscribe(listenerId);
  }

  // Cleanup when component unmounts
  destroy = () => {
    if (this.destroyed) return;
    this.destroyed = true;

    this.subscriptions.forEach((id) => {
      globalEventManager.unsubscribe(id);
    });
    this.subscriptions = new Set();
    if (this.registered) {
      globalEventManager.unregisterComponent(this.componentId);
      this.registered = false;
    }
    console.info(
      `🧹 Cleaned up mailbox for ${this.name} with id: ${this.componentId}`
    );
  };
}
