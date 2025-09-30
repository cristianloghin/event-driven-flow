import { globalEventManager } from "./EventManager";
import { ActionState, ChannelSchema, StringKey, TypedChannel } from "../types";

export class ComponentMailbox {
  private componentId: string;
  private subscriptions: string[] = [];

  constructor(componentId: string) {
    this.componentId = componentId;
  }

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
        (response: TResponse) => {
          cleanup();
          resolve(response);
        },
        {
          componentId: this.componentId,
          once: true,
        }
      );

      // Send request with reply information
      channel.emit(
        action,
        {
          ...payload,
          _replyTo: replyChannel,
          _correlationId: correlationId,
        } as TSchema[TAction],
        {
          emitterId: this.componentId,
        }
      );
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
    handler: (
      payload: TSchema[TAction] & { _replyTo?: string; _correlationId?: string }
    ) => void
  ): string {
    const listenerId = channel.subscribe(
      action,
      (payload, eventMetadata) => {
        // Ignore own messages
        if (eventMetadata.emitterId === this.componentId) return;
        handler(payload);
      },
      {
        componentId: this.componentId,
      }
    );

    this.subscriptions.push(listenerId);
    return listenerId;
  }

  // Cleanup when component unmounts
  destroy(): void {
    this.subscriptions.forEach((id) => {
      globalEventManager.unsubscribe(id);
    });
    this.subscriptions = [];
  }
}
