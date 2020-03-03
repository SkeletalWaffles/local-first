//
import fixtures from './fixtures';
import deepEqual from 'fast-deep-equal';

import {
    apply,
    insert,
    del,
    format,
    init,
    inflate,
    walk,
    fmtIdx,
    toKey,
} from './';

const walkWithFmt = (state, fn) => {
    const format = {};
    const fmt = {};
    walk(state, node => {
        if (node.content.type === 'text') {
            fn(node.content.text, fmt);
        } else if (node.content.type === 'open') {
            if (!format[node.content.key]) {
                format[node.content.key] = [node.content];
            } else {
                const idx = fmtIdx(format[node.content.key], node.content);
                // insert into sorted order.
                format[node.content.key].splice(idx, 0, node.content);
            }
            fmt[node.content.key] = format[node.content.key][0].value;
        } else if (node.content.type === 'close') {
            const f = format[node.content.key];
            if (!f) {
                console.log('nope at the close', node.content);
            }
            const idx = f.findIndex(item => item.stamp === node.content.stamp);
            if (idx !== -1) {
                f.splice(idx, 1);
            }
            if (f.length) {
                fmt[node.content.key] = f[0].value;
            } else {
                delete fmt[node.content.key];
            }
        }
    });
};

const showContents = contents => {
    if (contents.type === 'text') {
        return `text(${contents.text})`;
    } else if (contents.type === 'open') {
        return `>${contents.key}(${contents.value}):${contents.stamp}`;
    } else {
        return `<${contents.key}:${contents.stamp}`;
    }
};

const justContents = state => {
    const res = [];
    walk(state, node => res.push(showContents(node.content)));
    return res;
};

const getFormatValues = (state, formats) => {
    const res = {};
    Object.keys(formats).forEach(key => {
        if (formats[key].length) {
            const node = state.map[formats[key][0]];
            if (node.content.type !== 'open') {
                throw new Error(
                    `A formats list had a non-open node in it ${toKey(
                        node.id,
                    )}`,
                );
            }
            res[key] = node.content.value;
        }
    });
    return res;
};

const testAltSerialize = state => {
    const res = [];
    walk(state, node => {
        if (node.content.type === 'text') {
            const fmt = getFormatValues(state, node.formats);
            if (res.length && deepEqual(res[res.length - 1].fmt, fmt)) {
                res[res.length - 1].text += node.content.text;
            } else {
                res.push({
                    text: node.content.text,
                    fmt,
                });
            }
        }
    });
    return res;
};

const testSerialize = state => {
    const res = [];
    walkWithFmt(state, (text, format) => {
        if (res.length && deepEqual(res[res.length - 1].fmt, format)) {
            res[res.length - 1].text += text;
        } else {
            res.push({ text, fmt: { ...format } });
        }
    });
    return res;
};

const actionToDeltas = (state, action) => {
    if (action.type === 'insert') {
        return insert(state, action.at, action.text, action.format);
    } else if (action.type === 'delete') {
        return [del(state, action.at, action.count)];
    } else if (action.type === 'fmt') {
        return [
            format(
                state,
                action.at,
                action.count,
                action.key,
                action.value,
                action.stamp,
            ),
        ];
    }
};

describe('rich-text-crdt', () => {
    fixtures.forEach((test, i) => {
        const title = test.title ? test.title : 'should work ' + i;
        const actions = test.actions ? test.actions : test;
        it(title, () => {
            let state = init('a');
            actions.forEach(action => {
                // console.log('action', action);
                if (action.state) {
                    const ser = testSerialize(state);
                    const alt = testAltSerialize(state);
                    try {
                        expect(ser).toEqual(alt, 'format caches wrong');
                        expect(ser).toEqual(
                            action.state,
                            'expected state wrong',
                        );
                    } catch (err) {
                        console.log(JSON.stringify(state));
                        console.log(JSON.stringify(ser));
                        console.log(JSON.stringify(alt));
                        throw err;
                    }
                } else if (action.contents) {
                    expect(justContents(state)).toEqual(action.contents);
                } else if (action.parallel) {
                    let pre = { ...state };
                    const states = { a: { deltas: [], state } };
                    Object.keys(action.parallel).forEach(site => {
                        if (!states[site]) {
                            states[site] = {
                                deltas: [],
                                state: inflate(site, pre.roots, pre.map),
                            };
                        }
                        action.parallel[site].forEach(subAction => {
                            const deltas = actionToDeltas(
                                states[site].state,
                                subAction,
                            );
                            deltas.forEach(delta => {
                                states[site].state = apply(
                                    states[site].state,
                                    delta,
                                );
                                states[site].deltas.push(delta);
                            });
                        });
                    });
                    state = states.a.state;
                    Object.keys(action.parallel).forEach(site => {
                        if (site !== state.site) {
                            states[site].deltas.forEach(delta => {
                                state = apply(state, delta);
                            });
                        }
                    });
                } else {
                    const deltas = actionToDeltas(state, action);
                    deltas.forEach(delta => {
                        state = apply(state, delta);
                    });
                }
            });
        });
    });
});
