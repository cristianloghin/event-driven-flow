import { useCallback, useEffect, useRef, useState } from "react";
import { ChannelSchema, StringKey, TypedChannel } from "../types";
import { globalEventManager } from "../core/EventManager";

export function syncStateFactory<TSchema extends ChannelSchema>(
  channel: TypedChannel<TSchema>
) {
  return function useSyncState<TAction extends StringKey<TSchema>>(
    action: TAction,
    options?: {
      initialValue?: TSchema[TAction];
      restoreOnMount?: boolean;
    }
  ): [
    TSchema[TAction],
    (
      newValue:
        | TSchema[TAction]
        | ((prevState: TSchema[TAction]) => TSchema[TAction])
    ) => void
  ] {
    const stateRef = useRef<TSchema[TAction]>(
      getInitialState(channel, action, options?.initialValue)
    );
    const [state, setState] = useState<TSchema[TAction]>(stateRef.current);
    const { restoreOnMount = false } = options || {};

    useEffect(() => {
      if (restoreOnMount) {
        const lastPayload = globalEventManager.getLastPayload(channel, action);

        if (lastPayload) {
          console.info(
            `♻️ Restored value for ${channel.name}.${action}:`,
            lastPayload
          );
          setState(lastPayload);
          stateRef.current = lastPayload;
        }
      }
    }, []);

    useEffect(() => {
      const listenerId = channel.subscribe(action, (payload) => {
        setState(payload);
        stateRef.current = payload;
      });

      return () => {
        globalEventManager.unsubscribe(listenerId);
      };
    }, [channel, action]);

    const updateState = useCallback(
      (
        newValue:
          | TSchema[TAction]
          | ((prevState: TSchema[TAction]) => TSchema[TAction])
      ) => {
        const finalState =
          typeof newValue === "function"
            ? (newValue as Function)(stateRef.current)
            : newValue;

        setState(finalState);
        stateRef.current = finalState;
        channel.emit(action, finalState);
      },
      [channel, action]
    );

    return [state, updateState];
  };
}

function getInitialState<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema>
>(
  channel: TypedChannel<TSchema>,
  action: TAction,
  initialValue?: TSchema[TAction]
) {
  if (initialValue !== undefined) {
    return initialValue;
  }

  if (channel.initialState) {
    return channel.initialState[action];
  }

  return {} as TSchema[TAction];
}
