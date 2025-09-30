import { memo } from "react";
import { ComponentIdContext } from "../context";
import { useComponentId } from "./useComponentId";
import { EventManager, globalEventManager } from "../core/EventManager";

// Helper component that calls the function and returns null
const ServiceComponent = ({
  manager,
  Component,
}: {
  manager: EventManager;
  Component: (manager: EventManager) => void;
}) => {
  Component(manager);
  return null;
};

export function withService(
  serviceName: string,
  metadata?: { [key: string]: any }
) {
  return function (Component: (manager: EventManager) => void) {
    const WrappedComponent = () => {
      const componentId = useComponentId(serviceName, metadata);

      return (
        <ComponentIdContext.Provider value={componentId}>
          <ServiceComponent
            manager={globalEventManager}
            Component={Component}
          />
        </ComponentIdContext.Provider>
      );
    };

    WrappedComponent.displayName = serviceName;
    return memo(WrappedComponent);
  };
}
