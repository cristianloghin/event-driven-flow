import { useEffect, useRef, useState } from "react";

import { globalEventManager } from "../core/EventManager";
import { ComponentMetadata } from "../types";

export function useComponentId(
  componentName: string,
  metadata: Omit<ComponentMetadata, "name" | "registeredAt"> = {}
) {
  const [componentId, setComponentId] = useState<string | null>(null);

  // Register component on mount
  useEffect(() => {
    const id = globalEventManager.registerComponent(componentName, metadata);
    setComponentId(id);

    // Cleanup on unmount
    return () => {
      globalEventManager.unregisterComponent(id);
      setComponentId(null);
    };
  }, [componentName]); // Include componentName in deps to handle component name changes

  return componentId;
}
