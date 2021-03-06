// @flow
import { type PeerChange } from '../types';
import { type ClientMessage, type ServerMessage } from '../server';
import type { Network, NetworkCreator } from '../types.js';
import backOff from '../back-off';

const reconnectingSocket = (
    url,
    onOpen,
    onMessage: (string, (string) => void) => mixed,
    updateStatus: SyncStatus => mixed,
) => {
    const state: { socket: ?WebSocket, closed: boolean } = {
        socket: null,
        closed: false,
    };
    const reconnect = () => {
        state.socket = null;
        if (state.closed) {
            return;
        }
        updateStatus({ status: 'pending' });
        backOff(
            () =>
                new Promise((res, rej) => {
                    console.log('OPENING WEBSCOKET', url);
                    const socket = new WebSocket(url);
                    let opened = false;
                    let closed = false;
                    socket.addEventListener('open', () => {
                        if (state.socket) {
                            state.socket.close();
                        }
                        state.socket = socket;
                        setTimeout(() => {
                            if (!closed) {
                                opened = true;
                                updateStatus({ status: 'connected' });
                                res(true);
                                onOpen();
                            }
                        }, 50);
                    });
                    socket.addEventListener('close', () => {
                        if (state.socket && state.socket !== socket) {
                            // Some other socket has superceeded this one
                            return;
                        }
                        updateStatus({ status: 'disconnected' });
                        closed = true;
                        if (opened) {
                            reconnect();
                        } else {
                            res(false);
                        }
                    });
                    socket.addEventListener('message', ({ data }: { data: any }) =>
                        onMessage(data, response => socket.send(response)),
                    );
                }),
            500,
            1.5,
        );
    };
    reconnect();
    return state;
};

export type SyncStatus =
    | { status: 'pending' }
    | { status: 'connected' }
    | { status: 'disconnected' };

const addParams = (url, params) => url + (url.includes('?') ? '&' : '?') + params;

const createWebSocketNetwork = <Delta, Data>(
    url: string,
): NetworkCreator<Delta, Data, SyncStatus> => (
    sessionId: string,
    getMessages,
    handleMessages,
): Network<SyncStatus> => {
    let outerState = null;
    // let closed = false;
    return {
        initial: { status: 'pending' },
        createSync: (sendCrossTabChange, updateStatus, softResync) => {
            console.log('Im the leader (websocket)');
            const state = (outerState = reconnectingSocket(
                addParams(url, `siteId=${sessionId}`),
                () => sync(false),
                async (msg, respond) => {
                    const messages = JSON.parse(msg);
                    const responseMessages = await handleMessages(
                        messages,
                        sendCrossTabChange,
                    ).catch(err => {
                        console.log('Failed to handle messages!');
                        console.error(err);
                    });
                    if (responseMessages != null && responseMessages.length > 0) {
                        respond(JSON.stringify(responseMessages));
                    }
                },
                updateStatus,
            ));

            const sync = (softSync: boolean) => {
                if (state.socket) {
                    const socket = state.socket;
                    getMessages(!softSync).then(
                        messages => {
                            if (messages.length) {
                                socket.send(JSON.stringify(messages));
                            } else {
                                console.log('nothing to sync here');
                            }
                        },
                        err => {
                            console.error('Failed to sync messages folks');
                            console.error(err);
                        },
                    );
                } else {
                    console.log('but no socket');
                }
            };
            return sync;
        },
        close: () => {
            if (outerState != null) {
                outerState.closed = true;
            }
            if (outerState != null && outerState.socket != null) {
                outerState.socket.close();
                console.log('CLOSING WEBSOCKET');
            }
        },
    };
};

export default createWebSocketNetwork;
