import { useCallback, useContext, useEffect, useState } from "react";

import { ComponentIdContext } from "../context";
import { globalEventManager } from "../core/EventManager";
import { ChannelSchema, StringKey, TypedChannel } from "../types";
import { useEmit } from "./useEmit";
import { useSubscribe } from "./useSubscribe";

function getInitialState<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema>,
  TSelector extends TSchema[TAction] = TSchema[TAction]
>(
  channel: TypedChannel<TSchema>,
  action: TAction,
  options?: {
    initialValue?: TSelector;
    selector?: (state: TSchema[TAction]) => TSelector;
  }
) {
  if (options?.initialValue !== undefined) {
    return options.initialValue;
  }

  if (channel.initialState) {
    if (options?.selector) {
      return options.selector(channel.initialState[action]);
    }

    return channel.initialState[action] as TSelector;
  }

  return {} as TSelector;
}

export function useEventState<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema>,
  TSelector extends TSchema[TAction] = TSchema[TAction]
>(
  channel: TypedChannel<TSchema>,
  action: TAction,
  options?: {
    initialValue?: TSelector;
    restoreOnMount?: boolean;
    selector?: (state: TSchema[TAction]) => TSelector;
  }
): [TSelector, (newValue: Partial<TSelector>) => void] {
  const componentId = useContext(ComponentIdContext) || "unknown";
  const [state, setState] = useState<TSelector>(
    getInitialState(channel, action, options)
  );
  const emit = useEmit();
  const { restoreOnMount = false } = options || {};

  useEffect(() => {
    if (restoreOnMount) {
      const lastPayload = restoreOnMount
        ? globalEventManager.getLastPayload(channel, action)
        : undefined;

      let restoredValue: TSelector | undefined;

      if (lastPayload) {
        restoredValue = options?.selector
          ? options.selector(lastPayload)
          : (lastPayload as TSelector);
        console.info(
          `♻️ Restored value for ${channel.name}.${action}:`,
          restoredValue
        );
        setState(restoredValue);
      }
    }
  }, []);

  useSubscribe(
    channel,
    action,
    (payload, eventMetadata) => {
      if (eventMetadata.emitterId === componentId) return; // Ignore own events
      setState(payload);
    },
    { selector: options?.selector }
  );

  const updateState = useCallback(
    (newValue: Partial<TSelector>) => {
      const newState = options?.selector
        ? options.selector({ ...state, ...newValue })
        : { ...state, ...newValue };
      setState(newState);
      emit(channel, action, { ...state, ...newValue }); // emit the entire updated state
    },
    [state, channel, action, emit]
  );

  return [state, updateState];
}
