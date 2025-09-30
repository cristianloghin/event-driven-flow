import { useEffect, useRef } from "react";

import { globalEventManager } from "../core/EventManager";
import { ComponentMetadata } from "../types";

export function useComponentId(
  componentName: string,
  metadata: Omit<ComponentMetadata, "name" | "registeredAt"> = {}
) {
  const componentIdRef = useRef<string | null>(null);

  // Register component on mount
  useEffect(() => {
    if (!componentIdRef.current) {
      componentIdRef.current = globalEventManager.registerComponent(
        componentName,
        metadata
      );
    }

    // Cleanup on unmount
    return () => {
      if (componentIdRef.current) {
        globalEventManager.unregisterComponent(componentIdRef.current);
        componentIdRef.current = null; // Reset ref so it can register again
      }
    };
  }, [componentName]); // Include componentName in deps to handle component name changes

  return componentIdRef.current;
}
