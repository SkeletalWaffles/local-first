// @flow

import type { CRDT, Span, Node } from './types';
import {
    posToPostLoc,
    nextSibling,
    walkFrom,
    nodeForKey,
    charactersBeforeNode,
} from './loc';
import { toKey, contentChars } from './utils';

export const selectionToSpans = function<Format>(
    state: CRDT,
    start: number,
    end: number,
): Array<Span> {
    let [loc, offset] = posToPostLoc(state, start);
    const spans = [];
    let count = end - start;

    walkFrom(state, toKey(loc), node => {
        if (node.content.type !== 'text' || node.deleted) {
            return;
        }
        const text = node.content.text;
        if (offset >= text.length) {
            offset -= text.length;
            return;
        }

        if (offset + count <= text.length) {
            spans.push({
                id: node.id[0] + offset,
                site: node.id[1],
                length: count,
            });
            return false;
        } else {
            spans.push({
                id: node.id[0] + offset,
                site: node.id[1],
                length: text.length - offset,
            });
            count = count - (text.length - offset);
            offset = 0;
        }
    });

    return spans;
};

const collectSelections = (crdt: CRDT, span: Span, selections) => {
    const node = nodeForKey(crdt, [span.id, span.site]);
    if (!node) {
        throw new Error(`Cannot find node for span ${JSON.stringify(span)}`);
    }
    const offset = span.id - node.id[0];
    const start = charactersBeforeNode(crdt, node) + offset;
    // it all fits within this node
    if (node.content.type !== 'text') {
        // throw new Error(`Cannot `)
        console.error('span is not a text node!', node.content, span);
        return;
    }
    const text = node.content.text;
    if (text.length - offset >= span.length) {
        selections.push({ start, end: start + span.length });
    } else {
        // Go to the end of this node, and then
        // request the node that represents the next part of
        // the span
        const amount = text.length - offset;
        if (amount > 0) {
            selections.push({ start, end: start + amount });
        }
        collectSelections(
            crdt,
            {
                id: span.id + amount,
                site: span.site,
                length: span.length - amount,
            },
            selections,
        );
    }
};

const mergeSelections = selections => {
    if (!selections.length) {
        return [];
    }
    const result = [selections[0]];
    for (let i = 1; i < selections.length; i++) {
        if (result[result.length - 1].end === selections[i].start) {
            result[result.length - 1].end = selections[i].end;
        } else {
            result.push(selections[i]);
        }
    }
    return result;
};

export const spansToSelections = (
    crdt: CRDT,
    spans: Array<Span>,
): Array<{ start: number, end: number }> => {
    const selections = [];
    spans.forEach(span => collectSelections(crdt, span, selections));
    // TODO merge selections
    return mergeSelections(selections);
};
