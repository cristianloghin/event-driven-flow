import { memo, useEffect, useRef } from "react";
import { ChannelAPI, ChannelSchema, TypedChannel } from "../types";
import { globalEventManager } from "../core/EventManager";
import {
  askFactory,
  receiveFactory,
  replyFactory,
  syncStateFactory,
  tellFactory,
} from "../factory";

export function withChannel<
  const TChannels extends readonly TypedChannel<ChannelSchema>[]
>(componentName: string, channels: TChannels, metadata = {}) {
  return function <P extends Record<string, unknown> = {}>(
    Component: React.ComponentType<
      P & {
        [K in TChannels[number]["name"]]: ChannelAPI<
          Extract<TChannels[number], { name: K }>["initialState"]
        >;
      }
    >
  ) {
    const Wrapped = (props: P) => {
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
            syncState: syncStateFactory(ch),
          };
          wrappedChannelsRef.current[ch.name] = channel;
        });
      }

      useEffect(() => {
        globalEventManager.registerComponent(componentIdRef.current, {
          name: componentName,
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

      return (
        <Component
          {...props}
          {...(wrappedChannelsRef.current as {
            [K in TChannels[number]["name"]]: ChannelAPI<
              Extract<TChannels[number], { name: K }>["initialState"]
            >;
          })}
        />
      );
    };

    Wrapped.displayName = componentName;
    return memo(Wrapped);
  };
}
