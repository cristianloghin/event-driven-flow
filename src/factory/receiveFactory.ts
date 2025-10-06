import { useEffect } from "react";
import {
  ChannelSchema,
  EventMetadata,
  StringKey,
  TypedChannel,
} from "../types";
import { globalEventManager } from "../core/EventManager";

export function receiveFactory<TSchema extends ChannelSchema>(
  componentId: string,
  channel: TypedChannel<TSchema>
) {
  return function useReceive<TAction extends StringKey<TSchema>>(
    action: TAction,
    cb: (payload: TSchema[TAction], metadata: EventMetadata) => void
  ) {
    useEffect(() => {
      const listenerId = channel.subscribe(
        action,
        (payload, eventMetadata) => {
          // Ignore own messages
          if (eventMetadata.emitterId === componentId) {
            return;
          }
          cb(payload, eventMetadata);
        },
        { componentId }
      );
      return () => {
        globalEventManager.unsubscribe(listenerId);
      };
    }, []);
  };
}
