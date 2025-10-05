export type StringKey<T> = keyof T extends string ? keyof T : never;
export type ActionState = Record<string, unknown>;
export type ChannelSchema = {
  [action: string]: unknown;
};

export interface SubscribeOptions<
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema>
> {
  componentId?: string;
  once?: boolean;
  filter?: (payload: TSchema[TAction]) => boolean;
}

export interface EventMetadata {
  eventName?: string; // Which channel.event this came from
  timestamp?: number; // When event was emitted (Date.now())
  correlationId?: string; // Unique ID for this event
  ancestorIds?: Set<string>; // Chain of event IDs (loop detection)
  emitterId?: string;
  replyTo?: string;
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
  TAction extends StringKey<TSchema> = StringKey<TSchema>
> {
  id: string;
  callback: (payload: TSchema[TAction], eventMetadata: EventMetadata) => void;
  once: boolean;
  filter?: (payload: TSchema[TAction]) => boolean;
  componentId?: string;
}

export interface TypedChannel<
  TSchema extends ChannelSchema,
  TName extends string = string
> {
  name: TName;
  initialState: TSchema;
  emit<TAction extends StringKey<TSchema>>(
    action: TAction,
    payload: TSchema[TAction],
    options?: EventMetadata
  ): void;
  subscribe<TAction extends StringKey<TSchema>>(
    action: TAction,
    callback: (payload: TSchema[TAction], eventMetadata: EventMetadata) => void,
    options?: SubscribeOptions<TSchema, TAction>
  ): string;
}

export type SyncStateFn = <
  TSchema extends ChannelSchema,
  TAction extends StringKey<TSchema>
>(
  channel: TypedChannel<TSchema>,
  action: TAction,
  options?: {
    initialValue?: TSchema[TAction];
    restoreOnMount?: boolean;
  }
) => [
  TSchema[TAction],
  (
    newValue:
      | TSchema[TAction]
      | ((prevState: TSchema[TAction]) => TSchema[TAction])
  ) => void
];

export interface ComponentMailboxInterface {
  tell<TSchema extends ChannelSchema, TAction extends StringKey<TSchema>>(
    channel: TypedChannel<TSchema>,
    action: TAction,
    payload: TSchema[TAction]
  ): void;

  ask<
    TSchema extends ChannelSchema,
    TAction extends StringKey<TSchema>,
    TResponse extends ActionState = ActionState
  >(
    channel: TypedChannel<TSchema>,
    action: TAction,
    payload: TSchema[TAction],
    timeout?: number
  ): Promise<TResponse>;

  receive<TSchema extends ChannelSchema, TAction extends StringKey<TSchema>>(
    channel: TypedChannel<TSchema>,
    action: TAction,
    handler: (payload: TSchema[TAction], metadata: EventMetadata) => void
  ): void;
}
