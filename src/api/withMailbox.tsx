import { memo, useEffect, useRef } from "react";

import { ComponentMailbox } from "../core/ComponentMailbox";

export function withMailbox<P extends Record<string, unknown>>(
  componentName: string,
  metadata = {}
) {
  return function (
    Component: React.ComponentType<
      P & {
        mailbox: ComponentMailbox;
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

      return <Component {...props} mailbox={mailboxRef.current} />;
    };

    Wrapped.displayName = componentName;
    return memo(Wrapped);
  };
}
