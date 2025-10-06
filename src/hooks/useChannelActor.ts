import { useEffect, useRef } from "react";
import { ChannelAPI, ChannelSchema, TypedChannel } from "../types";
import {
  askFactory,
  receiveFactory,
  replyFactory,
  syncStateFactory,
  tellFactory,
} from "../factory";
import { globalEventManager } from "../core/EventManager";

export function useChannelActor<
  const TChannels extends readonly TypedChannel<ChannelSchema>[]
>(name: string, channels: TChannels, metadata = {}) {
  const componentIdRef = useRef(crypto.randomUUID());
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const wrappedChannelsRef = useRef<Record<string, ChannelAPI<any>>>({});

  // Build wrapped channels once
  if (Object.keys(wrappedChannelsRef.current).length === 0) {
    channels.forEach((ch) => {
      wrappedChannelsRef.current[ch.name] = {
        tell: tellFactory(componentIdRef.current, ch),
        receive: receiveFactory(componentIdRef.current, ch),
        ask: askFactory(componentIdRef.current, ch, subscriptionsRef),
        reply: replyFactory(ch, componentIdRef.current),
        syncState: syncStateFactory(ch, componentIdRef.current),
      };
    });
  }

  // Lifecycle management
  useEffect(() => {
    globalEventManager.registerComponent(componentIdRef.current, {
      name,
      registeredAt: Date.now(),
      ...metadata,
    });

    return () => {
      subscriptionsRef.current.forEach((id) =>
        globalEventManager.unsubscribe(id)
      );
      globalEventManager.unregisterComponent(componentIdRef.current);
    };
  }, [name, metadata]);

  return wrappedChannelsRef.current as {
    [K in TChannels[number]["name"]]: ChannelAPI<
      Extract<TChannels[number], { name: K }>["initialState"]
    >;
  };
}
