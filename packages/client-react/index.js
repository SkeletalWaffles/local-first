// @flow
// import React from '../../examples/whiteboard/node_modules/react';

import { type Client, type Collection, type QueryOp } from '../client-bundle';

export const useSyncStatus = function<SyncStatus>(React: *, client: Client<SyncStatus>) {
    const [status, setStatus] = React.useState(client.getSyncStatus());
    React.useEffect(() => {
        return client.onSyncStatus(status => {
            // console.log('status', status);
            setStatus(status);
        });
    }, []);
    return status;
};

export const useItems = function<T: {}, SyncStatus>(
    React: *,
    client: Client<SyncStatus>,
    colid: string,
    ids: Array<string>,
): [Collection<T>, ?{ [key: string]: ?T }] {
    const col = React.useMemo(() => client.getCollection<T>(colid), []);
    // TODO something to indicate whether we've loaded from the database yet
    // also something to indicate whether we've ever synced with a server.
    const [items, setItems] = React.useState(() => {
        const items = {};
        let found = false;
        ids.forEach(id => {
            items[id] = col.getCached(id);
            if (items[id] != null) [(found = true)];
        });
        return found || ids.length === 0 ? items : null;
    });
    React.useEffect(() => {
        const listeners = ids.filter(Boolean).map(id => {
            if (!items || !items[id]) {
                col.load(id).then(
                    data => {
                        setItems(items => ({ ...items, [id]: data }));
                    },
                    err => {
                        console.error('Unable to load item!', id);
                        console.error(err);
                    },
                );
            }
            return col.onItemChange(id, data => setItems(items => ({ ...items, [id]: data })));
        });
        return () => listeners.forEach(fn => fn());
    }, [ids]);
    return [col, items];
};

export const useItem = function<T: {}, SyncStatus>(
    React: *,
    client: Client<SyncStatus>,
    colid: string,
    id: string,
): [Collection<T>, ?T | false] {
    const col = React.useMemo(() => client.getCollection<T>(colid), []);
    // TODO something to indicate whether we've loaded from the database yet
    // also something to indicate whether we've ever synced with a server.
    const [item, setItem] = React.useState(() => {
        const data = col.getCached(id);
        if (data == null) {
            return false;
        }
        return data;
    });
    React.useEffect(() => {
        if (item == null || item === false || id !== item.id) {
            if (item) {
                const newCached = col.getCached(id);
                if (newCached != null) {
                    setItem(newCached);
                    return col.onItemChange(id, setItem);
                } else {
                    // loading state
                    console.log('switch! reloading', id, item.id);
                    setItem(false);
                }
            }
            col.load(id).then(
                data => {
                    setItem(data);
                },
                err => {
                    console.error('Unable to load item!', id);
                    console.error(err);
                },
            );
        }
        return col.onItemChange(id, setItem);
    }, [id]);
    return [col, item];
};

/*

sharedCollection:
so that loadAll doesn't hit persistence & create all new objects.

*/

export const useCollection = function<T: {}, SyncStatus>(
    React: *,
    client: Client<SyncStatus>,
    name: string,
): [Collection<T>, { [key: string]: T }] {
    // Hmm maybe collections should be cached?
    const col = React.useMemo(() => client.getCollection<T>(name), []);
    // TODO something to indicate whether we've loaded from the database yet
    // also something to indicate whether we've ever synced with a server.
    const [data, setData] = React.useState(({}: { [key: string]: T }));
    React.useEffect(() => {
        col.loadAll().then(data => {
            setData(a => ({ ...a, ...data }));
            col.onChanges(changes => {
                setData(data => {
                    const n = { ...data };
                    changes.forEach(({ value, id }) => {
                        if (value) {
                            n[id] = value;
                        } else {
                            delete n[id];
                        }
                    });
                    return n;
                });
            });
        });
    }, []);
    return [col, data];
};

export const useQuery = function<T: {}, SyncStatus>(
    React: *,
    client: Client<SyncStatus>,
    name: string,
    key: string,
    op: QueryOp,
    value: any,
): [Collection<T>, Array<{ key: string, value: T }>] {
    // Hmm maybe collections should be cached?
    const col = React.useMemo(() => client.getCollection<T>(name), []);
    // TODO something to indicate whether we've loaded from the database yet
    // also something to indicate whether we've ever synced with a server.
    const [results, setResults] = React.useState([]);
    React.useEffect(() => {
        col.query(key, op, value).then(results => {
            setResults(results);
            col.onQueryChanges(key, op, value, (added, removed) => {
                setResults(results => {
                    results = results.filter(res => !removed.includes(res.key));
                    // STOPSHIP: Do I care about ordering here?
                    return results.concat(added);
                });
            });
        });
    }, []);
    return [col, results];
};
