import { useCallback, useEffect, useState } from "react";

import { ComponentMailbox } from "../core/ComponentMailbox";
import { globalEventManager } from "../core/EventManager";
import { ChannelSchema, StringKey, TypedChannel } from "../types";

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

export function useSyncState<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema>,
  TSelector extends TSchema[TAction] = TSchema[TAction]
>(
  mailbox: ComponentMailbox,
  channel: TypedChannel<TSchema>,
  action: TAction,
  options?: {
    initialValue?: TSelector;
    restoreOnMount?: boolean;
    selector?: (state: TSchema[TAction]) => TSelector;
  }
): [
  TSelector,
  (
    newValue:
      | TSelector
      | Partial<TSelector>
      | ((prevState: TSelector) => TSelector | Partial<TSelector>)
  ) => void
] {
  const [state, setState] = useState<TSelector>(
    getInitialState(channel, action, options)
  );
  const { restoreOnMount = false } = options || {};

  useEffect(() => {
    if (restoreOnMount) {
      const lastPayload = globalEventManager.getLastPayload(channel, action);

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

  useEffect(() => {
    const subscription = mailbox.receive(channel, action, (payload) => {
      const processedPayload = options?.selector
        ? options.selector(payload)
        : (payload as TSelector);
      setState(processedPayload);
    });

    return () => {
      globalEventManager.unsubscribe(subscription);
    };
  }, [mailbox, channel, action, options?.selector]);

  const updateState = useCallback(
    (
      newValue:
        | TSelector
        | Partial<TSelector>
        | ((prevState: TSelector) => TSelector | Partial<TSelector>)
    ) => {
      setState((currentState) => {
        let finalState: TSelector;

        if (typeof newValue === "function") {
          // Function pattern: setUser(prev => ({ ...prev, name: 'Updated' }))
          const result = (newValue as Function)(currentState);
          finalState =
            typeof result === "object" &&
            result !== null &&
            !Array.isArray(result)
              ? ({ ...currentState, ...result } as TSelector) // Partial update
              : (result as TSelector); // Full replacement
        } else if (
          typeof newValue === "object" &&
          newValue !== null &&
          !Array.isArray(newValue)
        ) {
          // Partial object pattern: setUser({ name: 'Updated' })
          finalState = { ...currentState, ...newValue } as TSelector;
        } else {
          // Full value pattern: setUser(newUser)
          finalState = newValue as TSelector;
        }

        mailbox.tell(channel, action, finalState);
        return finalState;
      });
    },
    [mailbox, channel, action]
  );

  return [state, updateState];
}
