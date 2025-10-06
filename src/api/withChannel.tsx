import { memo } from "react";
import { ChannelAPI, ChannelSchema, TypedChannel } from "../types";
import { useChannelActor } from "../hooks/useChannelActor";

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
      const channelProps = useChannelActor(componentName, channels, metadata);
      return <Component {...props} {...channelProps} />;
    };

    Wrapped.displayName = componentName;
    return memo(Wrapped);
  };
}
