// @flow

import deepEqual from 'fast-deep-equal';
import type { CRDT, Node, Delta, Span } from './types';
import { insert, del, format } from './deltas';
import { walkWithFmt } from './debug';
import { apply } from './apply';
import { spansToSelections } from './span';
import { locToPos, locToInsertionPos, formatAt } from './loc';
import { toKey } from './utils';

type Format = { [key: string]: any };

export type QuillDelta =
    | {| delete: number |}
    | {| insert: string, attributes?: ?Format |}
    | {| retain: number, attributes?: ?Format |};

export const stateToQuillContents = (state: CRDT) => {
    const ops = [];
    walkWithFmt(state, (text, fmt) => {
        const attributes = {};
        Object.keys(fmt).forEach(key => {
            if (fmt[key]) {
                attributes[key] = fmt[key];
            }
        });
        const op: { insert: string, attributes?: Format } = { insert: text };
        if (Object.keys(attributes).length) {
            op.attributes = attributes;
        }
        if (
            ops.length &&
            deepEqual(op.attributes, ops[ops.length - 1].attributes)
        ) {
            ops[ops.length - 1].insert += text;
        } else {
            ops.push(op);
        }
    });
    return { ops };
};

export const deltasToQuillDeltas = (
    state: CRDT,
    deltas: Array<Delta>,
): { state: CRDT, quillDeltas: Array<QuillDelta> } => {
    const res = [];
    deltas.forEach(delta => {
        res.push(...deltaToQuillDeltas(state, delta));
        state = apply(state, delta);
    });
    return { state, quillDeltas: res };
};

const deleteToDeltas = function<Format, QuillFormat>(
    state: CRDT,
    positions: Array<Span>,
): Array<QuillDelta> {
    const selections = spansToSelections(state, positions);
    let current = 0;
    const res = [];
    selections.forEach(selection => {
        if (selection.start !== current) {
            res.push({ retain: selection.start - current });
        }
        current = selection.end;
        res.push({
            delete: selection.end - selection.start,
        });
    });
    return res;
};

export const deltaToQuillDeltas = (
    state: CRDT,
    delta: Delta,
): Array<QuillDelta> => {
    const res = [];
    if (delta.type === 'insert') {
        const pos = locToInsertionPos(state, delta.after, delta.id);
        const fmt = formatAt(state, delta.after);
        const spread = fmt ? { attributes: fmt } : null;
        if (pos === 0) {
            return [{ insert: delta.text, ...spread }];
        }
        return [{ retain: pos }, { insert: delta.text, ...spread }];
    } else if (delta.type === 'delete') {
        return deleteToDeltas(state, delta.spans);
    } else if (delta.type === 'format') {
        const startPos = locToPos(state, {
            pre: true,
            id: delta.open.after[0],
            site: delta.open.after[1],
        });
        const endPos = locToPos(state, {
            pre: true,
            id: delta.close.after[0],
            site: delta.close.after[1],
        });
        const attributes = { [delta.key]: delta.value };
        if (startPos === 0) {
            return [{ retain: endPos, attributes }];
        }
        return [
            { retain: startPos },
            { retain: endPos - startPos, attributes },
        ];
    } else if (delta.type === 'delete-format') {
        const startPos = locToPos(state, {
            pre: true,
            id: delta.open[0],
            site: delta.open[1],
        });
        const endPos = locToPos(state, {
            pre: true,
            id: delta.close[0],
            site: delta.close[1],
        });
        const startNode = state.map[toKey(delta.open)];
        if (!startNode) {
            throw new Error(`Start node not found ${toKey(delta.open)}`);
        }
        if (startNode.content.type !== 'open') {
            throw new Error(
                `Start node not an open type ${toKey(
                    delta.open,
                )} - ${JSON.stringify(startNode.content)}`,
            );
        }
        const attributes = { [startNode.content.key]: null };
        if (startPos === 0) {
            return [{ retain: endPos, attributes }];
        }
        return [
            { retain: startPos },
            { retain: endPos - startPos, attributes },
        ];
    }
    return res;
};

export const quillDeltasToDeltas = (
    state: CRDT,
    quillDeltas: Array<QuillDelta>,
    genStamp: () => string,
) => {
    const result = [];
    let at = 0;
    quillDeltas.forEach(quillDelta => {
        if (quillDelta.insert) {
            result.push(
                ...insert(
                    state,
                    at,
                    quillDelta.insert,
                    quillDelta.attributes || {},
                    genStamp,
                ),
            );
            // at += quillDelta.insert.length
        }
        if (quillDelta.retain) {
            // TODO need to be able to delete formatting
            // Or actually quill does this by setting it to null
            // so I think we're fine.
            if (quillDelta.attributes) {
                const attrs = quillDelta.attributes;
                Object.keys(attrs).forEach(key => {
                    result.push(
                        format(
                            state,
                            at,
                            quillDelta.retain,
                            key,
                            attrs[key],
                            genStamp(),
                        ),
                    );
                });
            }
            at += quillDelta.retain;
        }
        if (quillDelta.delete) {
            result.push(del(state, at, quillDelta.delete));
            at += quillDelta.delete;
        }
    });
    return result;
};
