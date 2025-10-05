import { memo, useEffect, useRef } from "react";
import {
  ChannelSchema,
  EventMetadata,
  StringKey,
  TypedChannel,
} from "../types";
import { ComponentMailbox } from "../core/ComponentMailbox";
import { createChannelReceive } from "./createChannelReceive";

interface WrappedChannel<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema> = StringKey<TSchema>
> {
  receive: (
    action: TAction,
    handler: (payload: TSchema[TAction], metadata: EventMetadata) => void
  ) => void;
  tell: <KAction extends StringKey<TSchema>>(
    action: KAction,
    payload: TSchema[KAction]
  ) => void;
}

export function withChannel<
  const TChannels extends readonly TypedChannel<ChannelSchema>[]
>(componentName: string, channels: TChannels, metadata = {}) {
  return function <P extends Record<string, unknown> = {}>(
    Component: React.ComponentType<
      P & {
        [K in TChannels[number]["name"]]: WrappedChannel<
          Extract<TChannels[number], { name: K }>["initialState"]
        >;
      }
    >
  ) {
    const Wrapped = (props: P) => {
      const mailboxRef = useRef<ComponentMailbox | null>(null);
      const wrappedChannels: Record<string, unknown> = {};

      if (!mailboxRef.current) {
        mailboxRef.current = new ComponentMailbox(componentName, metadata);
        const mailbox = mailboxRef.current;

        channels.forEach((ch) => {
          wrappedChannels[ch.name] = {
            tell: mailbox.tell(ch),
            receive: createChannelReceive(mailbox, ch),
          };
        });
      }

      useEffect(() => {
        const abortController = new AbortController();
        mailboxRef.current!.init(abortController.signal);

        return () => {
          abortController.abort();
        };
      }, []);

      return (
        <Component
          {...props}
          {...(wrappedChannels as {
            [K in TChannels[number]["name"]]: WrappedChannel<
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
