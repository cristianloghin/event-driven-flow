import { memo, useEffect, useRef } from "react";

import { ComponentMailbox } from "../core/ComponentMailbox";

export function withEvents(componentName: string, metadata = {}) {
  return function (
    Component: React.ComponentType<{ mailbox: ComponentMailbox }>
  ) {
    const Wrapped = () => {
      const mailboxRef = useRef<ComponentMailbox | null>(null);

      if (!mailboxRef.current) {
        mailboxRef.current = new ComponentMailbox(componentName);
      }

      useEffect(() => {
        const abortController = new AbortController();
        mailboxRef.current!.init(abortController.signal);

        return () => {
          abortController.abort();
        };
      }, []);

      return <Component mailbox={mailboxRef.current} />;
    };

    const MemoWrapped = memo(Wrapped);
    MemoWrapped.displayName = componentName;
    return MemoWrapped;
  };
}
