import { useEffect } from "react";
import { ComponentMailbox } from "../core/ComponentMailbox";
import {
  ChannelSchema,
  EventMetadata,
  StringKey,
  TypedChannel,
} from "../types";

export function createMailboxReceive(mailbox: ComponentMailbox) {
  return function useMailboxReceive<
    TSchema extends ChannelSchema,
    TAction extends StringKey<TSchema>
  >(
    channel: TypedChannel<TSchema>,
    action: TAction,
    handler: (payload: TSchema[TAction], metadata: EventMetadata) => void
  ) {
    useEffect(() => {
      const unsub = mailbox.receive(channel, action, handler);
      return () => unsub();
    }, []);
  };
}
