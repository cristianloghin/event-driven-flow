import { memo, useEffect, useRef } from "react";
import { ComponentIdContext } from "../context";
import { useComponentId } from "./useComponentId";
import { ComponentMailbox } from "../core/ComponentMailbox";

// Helper component that calls the function and returns null
const ServiceComponent = ({
  mailbox,
  Component,
}: {
  mailbox: ComponentMailbox;
  Component: (mailbox: ComponentMailbox) => void;
}) => {
  Component(mailbox);
  return null;
};

export function withService(
  serviceName: string,
  metadata?: { [key: string]: any }
) {
  return function (Component: (mailbox: ComponentMailbox) => void) {
    const WrappedComponent = () => {
      const componentId = useComponentId(serviceName, metadata);
      const mailboxRef = useRef<ComponentMailbox | null>(null);

      if (!mailboxRef.current && componentId) {
        mailboxRef.current = new ComponentMailbox(componentId);
      }

      useEffect(() => {
        return () => {
          mailboxRef.current?.destroy();
        };
      }, []);

      // Don't render until componentId is available
      if (!componentId || !mailboxRef.current) {
        return null;
      }

      return (
        <ComponentIdContext.Provider value={componentId}>
          <ServiceComponent
            mailbox={mailboxRef.current}
            Component={Component}
          />
        </ComponentIdContext.Provider>
      );
    };

    WrappedComponent.displayName = serviceName;
    return memo(WrappedComponent);
  };
}
