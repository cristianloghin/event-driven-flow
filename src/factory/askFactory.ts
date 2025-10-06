import { RefObject } from "react";
import { globalEventManager } from "../core/EventManager";
import { ChannelSchema, StringKey, TypedChannel } from "../types";

export function askFactory<TSchema extends ChannelSchema>(
  componentId: string,
  channel: TypedChannel<TSchema>,
  subscriptionsRef: RefObject<Set<string>>
) {
  return function <TAction extends StringKey<TSchema>, TResponse>(
    action: TAction,
    payload: TSchema[TAction],
    timeout = 5000
  ): Promise<TResponse> {
    const correlationId = `${componentId}_${Date.now()}_${Math.random()
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
          subscriptionsRef.current.delete(listenerId);
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
          componentId,
          once: true,
        }
      );

      subscriptionsRef.current.add(listenerId);

      // Send request with reply information
      channel.emit(action, payload as TSchema[TAction], {
        emitterId: componentId,
        replyTo: replyChannel,
        correlationId: correlationId,
      });
    });
  };
}
