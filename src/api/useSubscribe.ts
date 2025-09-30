import { useContext, useEffect, useRef } from "react";

import { ComponentIdContext } from "../context";
import { globalEventManager } from "../core/EventManager";
import {
  ChannelSchema,
  EventMetadata,
  StringKey,
  SubscribeOptions,
  TypedChannel,
} from "../types";

export function useSubscribe<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema> = StringKey<TSchema>,
  TSelector extends TSchema[TAction] = TSchema[TAction]
>(
  channel: TypedChannel<TSchema>,
  action: TAction,
  callback: (payload: TSelector, eventMetadata: EventMetadata) => void,
  options: SubscribeOptions<TSchema, TAction, TSelector> = {}
) {
  const componentId =
    useContext(ComponentIdContext) || options.componentId || "unknown";
  const callbackRef = useRef(callback);
  const listenerIdRef = useRef<string | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const wrappedCallback = (
      payload: TSelector,
      eventMetadata: EventMetadata
    ) => callbackRef.current(payload, eventMetadata);

    listenerIdRef.current = channel.subscribe(action, wrappedCallback, {
      ...options,
      componentId,
    });

    return () => {
      if (listenerIdRef.current) {
        globalEventManager.unsubscribe(listenerIdRef.current);
      }
    };
  }, [channel, action, options.once, options.filter]);

  return listenerIdRef.current;
}
