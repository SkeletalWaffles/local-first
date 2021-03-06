// @flow
import type { ClientMessage, ServerMessage, CursorType, ServerState } from '../core/src/server';
import { onMessage, getMessages } from '../core/src/server';

export const post = <Delta, Data>(
    server: ServerState<Delta, Data>,
    sessionId: string,
    messages: Array<ClientMessage<Delta, Data>>,
): Array<ServerMessage<Delta, Data>> => {
    let maxStamp = null;
    // console.log(`sync:messages`, messages);
    const acks = messages.map(message => onMessage(server, sessionId, message)).filter(Boolean);
    // console.log('ack', acks);
    const responses = getMessages(server, sessionId);
    // console.log('messags', responses);
    return acks.concat(responses);
};
