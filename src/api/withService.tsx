import { memo, useEffect, useRef } from "react";
import { ChannelAPI, ChannelSchema, TypedChannel } from "../types";
import {
  askFactory,
  receiveFactory,
  replyFactory,
  syncStateFactory,
  tellFactory,
} from "../factory";
import { globalEventManager } from "../core/EventManager";

// Helper component that calls the function and returns null
export function withService<
  const TChannels extends readonly TypedChannel<ChannelSchema>[]
>(serviceName: string, channels: TChannels, metadata = {}) {
  return function (
    ServiceFn: (channels: {
      [K in TChannels[number]["name"]]: ChannelAPI<
        Extract<TChannels[number], { name: K }>["initialState"]
      >;
    }) => void | (() => void)
  ) {
    const Wrapped = () => {
      const componentIdRef = useRef(crypto.randomUUID());
      const subscriptionsRef = useRef<Set<string>>(new Set());
      const wrappedChannelsRef = useRef<Record<string, unknown>>({});

      if (Object.keys(wrappedChannelsRef.current).length === 0) {
        channels.forEach((ch) => {
          const channel = {
            tell: tellFactory(componentIdRef.current, ch),
            receive: receiveFactory(componentIdRef.current, ch),
            ask: askFactory(componentIdRef.current, ch, subscriptionsRef),
            reply: replyFactory(ch, componentIdRef.current),
            syncState: syncStateFactory(ch, componentIdRef.current),
          };
          wrappedChannelsRef.current[ch.name] = channel;
        });
      }

      useEffect(() => {
        globalEventManager.registerComponent(componentIdRef.current, {
          name: serviceName,
          registeredAt: Date.now(),
          ...metadata,
        });

        return () => {
          subscriptionsRef.current.forEach((id) =>
            globalEventManager.unsubscribe(id)
          );
          globalEventManager.unregisterComponent(componentIdRef.current);
        };
      }, []);

      useEffect(() => {
        const cleanup = ServiceFn(wrappedChannelsRef.current as any);
        return cleanup;
      }, []);

      return null;
    };

    Wrapped.displayName = serviceName;
    return memo(Wrapped);
  };
}
