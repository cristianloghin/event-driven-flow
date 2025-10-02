import { memo, useEffect, useRef } from "react";
import { ComponentMailbox } from "../core/ComponentMailbox";

// Helper component that calls the function and returns null
export function withService(
  serviceName: string,
  metadata?: { [key: string]: any }
) {
  return function (
    ServiceFn: (mailbox: ComponentMailbox) => void | (() => void)
  ) {
    const Wrapped = () => {
      const mailboxRef = useRef<ComponentMailbox | null>(null);

      if (!mailboxRef.current) {
        mailboxRef.current = new ComponentMailbox(serviceName);
      }

      useEffect(() => {
        const abortController = new AbortController();
        const mailbox = mailboxRef.current!;
        mailbox.init(abortController.signal);

        const maybeCleanup = ServiceFn(mailbox);

        return () => {
          if (typeof maybeCleanup === "function") {
            maybeCleanup();
          }
          abortController.abort();
        };
      }, []);

      return null;
    };

    Wrapped.displayName = serviceName;
    return memo(Wrapped);
  };
}
