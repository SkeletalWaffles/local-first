// @flow

import type { Client } from '../types';
import type {
    ClockPersist,
    MultiPersistence,
    Network,
    NetworkCreator,
    BlobNetworkCreator,
} from '../types';
import { peerTabAwareNetworks } from '../delta/peer-tabs';
import type { HLC } from '@local-first/hybrid-logical-clock';
import * as hlc from '@local-first/hybrid-logical-clock';
import { type Schema } from '@local-first/nested-object-crdt/schema.js';
import deepEqual from 'fast-deep-equal';
import { type PeerChange } from '../types';

import {
    newCollection,
    getCollection,
    onCrossTabChanges,
    type CRDTImpl,
    type CollectionState,
} from '../shared';

const genId = () =>
    Math.random()
        .toString(36)
        .slice(2);

import { type ClientMessage, type ServerMessage } from '../server';
export const getMessages = function<Delta, Data>(
    serverId: string,
    persistence: MultiPersistence,
    reconnected: boolean,
): Promise<Array<ClientMessage<Delta, Data>>> {
    return Promise.all(
        persistence.collections.map(
            async (
                collection: string,
            ): Promise<?ClientMessage<Delta, Data>> => {
                const deltas = await persistence.deltas(serverId, collection);
                const serverCursor = await persistence.getServerCursor(
                    serverId,
                    collection,
                );
                if (deltas.length || !serverCursor || reconnected) {
                    console.log('messages yeah', serverCursor);
                    return {
                        type: 'sync',
                        collection,
                        serverCursor,
                        deltas: deltas.map(({ node, delta }) => ({
                            node,
                            delta,
                        })),
                    };
                }
            },
        ),
    ).then(a => a.filter(Boolean));
};

export const handleMessages = async function<Delta, Data>(
    serverId: string,
    crdt: CRDTImpl<Delta, Data>,
    persistence: MultiPersistence,
    messages: Array<ServerMessage<Delta, Data>>,
    state: { [colid: string]: CollectionState<Data, any> },
    recvClock: HLC => void,
    sendCrossTabChanges: PeerChange => mixed,
) {
    await Promise.all(
        messages.map(async msg => {
            if (msg.type === 'sync') {
                const col = state[msg.collection];

                const changed = {};
                msg.deltas.forEach(delta => {
                    changed[delta.node] = true;
                });

                const deltasWithStamps = msg.deltas.map(delta => ({
                    ...delta,
                    stamp: crdt.deltas.stamp(delta.delta),
                }));

                const changedIds = Object.keys(changed);
                console.log('applying deltas', msg.serverCursor);
                const data = await persistence.applyDeltas(
                    serverId,
                    msg.collection,
                    deltasWithStamps,
                    msg.serverCursor,
                    (data, delta) => crdt.deltas.apply(data, delta),
                );

                if (col.listeners.length) {
                    const changes = changedIds.map(id => ({
                        id,
                        value: crdt.value(data[id]),
                    }));
                    col.listeners.forEach(listener => {
                        listener(changes);
                    });
                }
                changedIds.forEach(id => {
                    // Only update the cache if the node has already been cached
                    if (state[msg.collection].cache[id]) {
                        state[msg.collection].cache[id] = data[id];
                    }
                    if (col.itemListeners[id]) {
                        col.itemListeners[id].forEach(fn =>
                            fn(crdt.value(data[id])),
                        );
                    }
                });

                if (changedIds.length) {
                    console.log(
                        'Broadcasting to client-level listeners',
                        changedIds,
                    );
                    sendCrossTabChanges({
                        col: msg.collection,
                        nodes: changedIds,
                    });
                }

                let maxStamp = null;
                msg.deltas.forEach(delta => {
                    const stamp = crdt.deltas.stamp(delta.delta);
                    if (!maxStamp || stamp > maxStamp) {
                        maxStamp = stamp;
                    }
                });
                if (maxStamp) {
                    recvClock(hlc.unpack(maxStamp));
                }
            } else if (msg.type === 'ack') {
                return persistence.deleteDeltas(
                    serverId,
                    msg.collection,
                    msg.deltaStamp,
                );
            }
        }),
    );
};

function createClient<Delta, Data, SyncStatus>(
    crdt: CRDTImpl<Delta, Data>,
    schemas: { [colid: string]: Schema },
    clockPersist: ClockPersist,
    persistence: MultiPersistence,
    deltaNetworks: {
        [serverId: string]: NetworkCreator<Delta, Data, SyncStatus>,
    },
    blobNetworks: { [serverId: string]: BlobNetworkCreator<Data, SyncStatus> },
): Client<{ [key: string]: SyncStatus }> {
    let clock = clockPersist.get(() => hlc.init(genId(), Date.now()));
    const state: { [key: string]: CollectionState<Data, any> } = {};
    persistence.collections.forEach(id => (state[id] = newCollection()));

    const getStamp = () => {
        clock = hlc.inc(clock, Date.now());
        clockPersist.set(clock);
        return hlc.pack(clock);
    };

    const setClock = (newClock: HLC) => {
        clock = newClock;
        clockPersist.set(clock);
    };

    const recvClock = (newClock: HLC) => {
        clock = hlc.recv(clock, newClock, Date.now());
        clockPersist.set(clock);
    };

    const allDirty = [];

    // Oh noes!!! Here we are, needing to extract out the cross-tab
    // stuff. Only one thing should handle cross-tabs.
    // This makes me think that actually no networks should
    // handle their own cross-tabulation.
    // Which makes sense, especially in a native app situation,
    // where there would be no cross-tab shenanigans.
    const handlePeerChange = (msg: PeerChange) => {
        return onCrossTabChanges(
            crdt,
            persistence,
            state[msg.col],
            msg.col,
            msg.nodes,
        );
    };

    const allNetworks: { [key: string]: Network<SyncStatus> } = {};

    Object.keys(deltaNetworks).forEach(serverId => {
        allNetworks[serverId] = deltaNetworks[serverId](
            clock.node,
            fresh => getMessages(serverId, persistence, fresh),
            (messages, sendCrossTabChanges) =>
                handleMessages(
                    serverId,
                    crdt,
                    persistence,
                    messages,
                    state,
                    recvClock,
                    sendCrossTabChanges,
                ),
        );
    });
    const network = peerTabAwareNetworks(handlePeerChange, allNetworks);

    const setDirty = () => allDirty.forEach(f => f());

    return {
        sessionId: clock.node,
        getStamp,
        setDirty,
        getCollection<T>(colid: string) {
            return getCollection(
                colid,
                crdt,
                persistence,
                state[colid],
                getStamp,
                setDirty,
                network.sendCrossTabChanges,
                schemas[colid],
            );
        },
        onSyncStatus(fn) {
            network.onSyncStatus(fn);
        },
        getSyncStatus() {
            return network.getSyncStatus();
        },
    };
}

export default createClient;
