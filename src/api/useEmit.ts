import { useCallback, useContext } from "react";

import { ComponentIdContext } from "../context";
import {
  ChannelSchema,
  EventMetadata,
  StringKey,
  TypedChannel,
} from "../types";

export function useEmit(options?: { id?: string }) {
  const componentId =
    useContext(ComponentIdContext) || options?.id || "unknown";

  return useCallback(
    <TSchema extends ChannelSchema, TAction extends StringKey<TSchema>>(
      channel: TypedChannel<TSchema>,
      action: TAction,
      payload: TSchema[TAction],
      options?: EventMetadata
    ) => {
      channel.emit(action, payload, {
        ...options,
        emitterId: componentId,
      });
    },
    [componentId]
  );
}
