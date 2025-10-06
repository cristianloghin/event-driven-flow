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
import { useChannelActor } from "../hooks/useChannelActor";

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
      const channelProps = useChannelActor(serviceName, channels, metadata);
      useEffect(() => {
        const cleanup = ServiceFn(channelProps);
        return cleanup;
      }, []);

      return null;
    };

    Wrapped.displayName = serviceName;
    return memo(Wrapped);
  };
}
