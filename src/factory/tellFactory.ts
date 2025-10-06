import { ChannelSchema, StringKey, TypedChannel } from "../types";

export function tellFactory<TSchema extends ChannelSchema>(
  componentId: string,
  channel: TypedChannel<TSchema>
) {
  return function <TAction extends StringKey<TSchema>>(
    action: TAction,
    payload: TSchema[TAction]
  ) {
    channel.emit(action, payload, { emitterId: componentId });
  };
}
