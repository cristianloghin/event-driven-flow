import { useEffect } from "react";
import { globalEventManager } from "../core/EventManager";
import { ChannelSchema, StringKey, TypedChannel } from "../types";

export function replyFactory<TSchema extends ChannelSchema>(
  channel: TypedChannel<TSchema>,
  componentId: string
) {
  return function useReply<TAction extends StringKey<TSchema>, TResponse>(
    action: TAction,
    cb: (payload: TSchema[TAction]) => TResponse
  ) {
    useEffect(() => {
      const listenerId = channel.subscribe(action, (p, m) => {
        if (m.emitterId === componentId) return;
        if (m.replyTo) {
          const response = cb(p);
          globalEventManager.emit(m.replyTo, response, {
            emitterId: componentId,
          });
        }
      });

      return () => {
        globalEventManager.unsubscribe(listenerId);
      };
    }, []);
  };
}
