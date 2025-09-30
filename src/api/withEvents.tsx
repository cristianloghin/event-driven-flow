import { JSX, memo } from "react";

import { ComponentIdContext } from "../context";
import { useComponentId } from "./useComponentId";
import { EventManager, globalEventManager } from "../core/EventManager";

// Helper component that calls the function and returns the JSX
const EventComponent = ({
  manager,
  Component,
}: {
  manager: EventManager;
  Component: (manager: EventManager) => JSX.Element;
}) => {
  return Component(manager);
};

export function withEvents(componentName: string, metadata = {}) {
  return function (Component: (manager: EventManager) => JSX.Element) {
    const WrappedComponent = () => {
      const componentId = useComponentId(componentName, metadata);

      return (
        <ComponentIdContext.Provider value={componentId}>
          <EventComponent manager={globalEventManager} Component={Component} />
        </ComponentIdContext.Provider>
      );
    };

    WrappedComponent.displayName = componentName;
    return memo(WrappedComponent);
  };
}
