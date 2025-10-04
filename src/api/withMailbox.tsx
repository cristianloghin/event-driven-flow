import { memo, useEffect, useRef } from "react";

import { ComponentMailbox } from "../core/ComponentMailbox";
import { createSyncState } from "./createSyncState";
import { ComponentMailboxInterface, SyncStateFn } from "../types";
import { createMailboxReceive } from "./createMailboxReceive";

export function withMailbox<P extends Record<string, unknown>>(
  componentName: string,
  metadata = {}
) {
  return function (
    Component: React.ComponentType<
      P & {
        mailbox: ComponentMailboxInterface;
        syncState: SyncStateFn;
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

      const mailbox: ComponentMailboxInterface = {
        tell: mailboxRef.current.tell,
        ask: mailboxRef.current.ask,
        receive: createMailboxReceive(mailboxRef.current),
      };

      return (
        <Component
          {...props}
          mailbox={mailbox}
          syncState={createSyncState(mailboxRef.current)}
        />
      );
    };

    Wrapped.displayName = componentName;
    return memo(Wrapped);
  };
}
