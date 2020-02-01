// @flow
import type { HLC } from '@local-first/hybrid-logical-clock';
import { type PeerChange } from '../client';

export type Network<SyncStatus> = {
    onSyncStatus(fn: (SyncStatus) => void): void,
    getSyncStatus(): SyncStatus,
    sendCrossTabChanges(PeerChange): void,
    setDirty: () => void,
};

// does persistence encapsulate the crdt?
// umm maybe?
// or we pass in the crdt with each call? yep

// Ok, so this is the min required for the `getCollection` thing to work, I believe.
export type Persistence = {
    collections: Array<string>,
    save<T>(colid: string, id: string, node: T): Promise<void>,
    // this saves local
    applyDelta<Delta, Data>(
        colid: string,
        id: string,
        delta: Delta,
        apply: (?Data, Delta) => Data,
    ): Promise<Data>,
    load<T>(colid: string, id: string): Promise<?T>,
    loadAll<T>(colid: string): Promise<{ [key: string]: T }>,
    // delete(colid: string, id: string): Promise<void>,
};

export type FullPersistence = {
    ...Persistence,
    getFull<Data>(): { [colid: string]: { [key: string]: Data } },
    mergeFull<Data>(full: {
        [colid: string]: { [key: string]: Data },
    }): Promise<{ [colid: string]: { [key: string]: Data } }>,
};

export type DeltaPersistence = {
    ...Persistence,
    // this doesn't save deltas locally, because they came from remote-land
    applyDeltas<Delta, Data>(
        colid: string,
        deltas: Array<{ node: string, delta: Delta, stamp: string }>,
        serverCursor: number,
        apply: (?Data, Delta) => Data,
    ): Promise<{ [key: string]: Data }>,
    deltas<Delta>(
        collection: string,
    ): Promise<Array<{ node: string, delta: Delta, stamp: string }>>,
    getServerCursor(collection: string): Promise<?number>,

    deleteDeltas(collection: string, upTo: string): Promise<void>,
};

export type ClockPersist = {
    get(init: () => HLC): HLC,
    set(HLC): void,
};
