import { JSX, memo, useEffect, useRef } from "react";

import { ComponentIdContext } from "../context";
import { useComponentId } from "./useComponentId";
import { ComponentMailbox } from "../core/ComponentMailbox";

// Helper component that calls the function and returns the JSX
const EventComponent = ({
  mailbox,
  Component,
}: {
  mailbox: ComponentMailbox;
  Component: (mailbox: ComponentMailbox) => JSX.Element;
}) => {
  return Component(mailbox);
};

export function withEvents(componentName: string, metadata = {}) {
  return function (Component: (mailbox: ComponentMailbox) => JSX.Element) {
    const WrappedComponent = () => {
      const componentId = useComponentId(componentName, metadata);
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
          <EventComponent mailbox={mailboxRef.current} Component={Component} />
        </ComponentIdContext.Provider>
      );
    };

    WrappedComponent.displayName = componentName;
    return memo(WrappedComponent);
  };
}
