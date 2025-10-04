import { memo, useEffect, useRef } from "react";

import { ComponentMailbox } from "../core/ComponentMailbox";
import { createSyncState } from "./createSyncState";
import { ChannelSchema, StringKey, TypedChannel } from "../types";

export function withMailbox<P extends Record<string, unknown>>(
  componentName: string,
  metadata = {}
) {
  return function (
    Component: React.ComponentType<
      P & {
        mailbox: ComponentMailbox;
        syncState: <
          TSchema extends ChannelSchema,
          TAction extends StringKey<TSchema>
        >(
          channel: TypedChannel<TSchema>,
          action: TAction,
          options?: {
            initialValue?: TSchema[TAction];
            restoreOnMount?: boolean;
          }
        ) => [
          TSchema[TAction],
          (
            newValue:
              | TSchema[TAction]
              | ((prevState: TSchema[TAction]) => TSchema[TAction])
          ) => void
        ];
      }
    >
  ) {
    const Wrapped = (props: P) => {
      const mailboxRef = useRef<ComponentMailbox | null>(null);

      if (!mailboxRef.current) {
        mailboxRef.current = new ComponentMailbox(componentName, metadata);
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
          mailbox={mailboxRef.current}
          syncState={createSyncState(mailboxRef.current)}
        />
      );
    };

    Wrapped.displayName = componentName;
    return memo(Wrapped);
  };
}
