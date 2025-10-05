import { globalEventManager } from "../core/EventManager";
import {
  ChannelMiddleware,
  ChannelObserver,
  ChannelSchema,
  EventMetadata,
  StringKey,
  SubscribeOptions,
  TypedChannel,
} from "../types";

type ChannelOptions<TSchema extends ChannelSchema> = {
  initialState?: TSchema;
  middleware?: ChannelMiddleware<TSchema>[];
  observers?: ChannelObserver<TSchema>[];
};

function createChannel<TSchema extends ChannelSchema>(
  options: ChannelOptions<TSchema> = {}
) {
  return function <const TName extends string>(channelName: TName) {
    const middleware = options.middleware || [];
    const observers = options.observers || [];
    const initialState = options.initialState || ({} as TSchema);

    const channel = {
      name: channelName,
      initialState,

      // Internal emit method for middleware pipeline (called by useEmit)
      emit<TAction extends StringKey<TSchema>>(
        action: TAction,
        payload: TSchema[TAction],
        options: EventMetadata = {}
      ) {
        const eventName = `${channelName}.${action}`;

        // Run middleware
        let processedPayload = payload;
        for (const mw of middleware) {
          processedPayload =
            mw(processedPayload, action, eventName) || processedPayload;
        }

        // Notify observers
        observers.forEach((observer) => {
          try {
            observer(eventName, processedPayload, options);
          } catch (error) {
            console.error("Observer error:", error);
          }
        });

        globalEventManager.emit(eventName, processedPayload, options);
      },

      // Subscribe to specific action
      subscribe<TAction extends StringKey<TSchema>>(
        action: TAction,
        callback: (
          payload: TSchema[TAction],
          eventMetadata?: EventMetadata
        ) => void,
        options: SubscribeOptions<TSchema, TAction> = {}
      ) {
        const eventName = `${channelName}.${action}`;
        return globalEventManager.subscribe(eventName, callback, options);
      },
    };

    return channel as TypedChannel<TSchema, TName>;
  };
}

export { createChannel };
