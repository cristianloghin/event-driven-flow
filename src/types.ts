export type StringKey<T> = keyof T extends string ? keyof T : never;
export type ActionState = Record<string, unknown>;
export type ChannelSchema = {
  [action: string]: ActionState;
};

export interface SubscribeOptions<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema>,
  TSelector extends TSchema[TAction]
> {
  componentId?: string;
  once?: boolean;
  filter?: (payload: TSchema[TAction]) => boolean;
  selector?: (payload: TSchema[TAction]) => TSelector;
  /**
   * When true (default), the EventManager will ensure only one active subscription
   * per (componentId, eventName) pair. Re-subscribing updates the existing listener's
   * callback/options instead of adding a new one. Set to false to allow multiple
   * distinct subscriptions from the same component to the same event.
   */
  dedupe?: boolean;
}

export interface EventMetadata {
  eventName?: string; // Which channel.event this came from
  timestamp?: number; // When event was emitted (Date.now())
  correlationId?: string; // Unique ID for this event
  ancestorIds?: Set<string>; // Chain of event IDs (loop detection)
  emitterId?: string;
}

export type ChannelMiddleware<TSchema extends ChannelSchema> = <
  TAction extends StringKey<TSchema> = StringKey<TSchema>
>(
  payload: TSchema[TAction],
  action: TAction,
  eventName: string
) => TSchema[TAction] | void;

export type ChannelObserver<TSchema extends ChannelSchema> = (
  eventName: string,
  payload: TSchema[StringKey<TSchema>],
  options: EventMetadata
) => void;

export interface ComponentMetadata {
  name: string;
  registeredAt: number;
  type?: string; // Optional type for categorization
  domain?: string; // Optional domain for namespacing
}

export interface ListenerInfo<
  TSchema extends ChannelSchema = ChannelSchema,
  TAction extends StringKey<TSchema> = StringKey<TSchema>,
  TSelector extends TSchema[TAction] = TSchema[TAction]
> {
  id: string;
  callback: (payload: TSelector, eventMetadata: EventMetadata) => void;
  once: boolean;
  filter?: (payload: TSchema[TAction]) => boolean;
  selector?: (payload: TSchema[TAction]) => TSelector;
  componentId?: string;
}

export interface TypedChannel<TSchema extends ChannelSchema> {
  name: string;
  initialState: TSchema;
  emit<TAction extends StringKey<TSchema>>(
    action: TAction,
    payload: TSchema[TAction],
    options?: EventMetadata
  ): void;
  subscribe<
    TAction extends StringKey<TSchema>,
    TSelector extends TSchema[TAction] = TSchema[TAction]
  >(
    action: TAction,
    callback: (payload: TSelector, eventMetadata: EventMetadata) => void,
    options?: SubscribeOptions<TSchema, TAction, TSelector>
  ): string;
}
