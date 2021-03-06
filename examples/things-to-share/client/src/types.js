// @flow

import { type Schema } from '../../../../packages/client-bundle';

export type TagT = {
    id: string,
    title: string,
    color: string,
};

export const TagSchema: Schema = {
    type: 'object',
    attributes: {
        id: 'string',
        title: 'string',
        color: 'string',
    },
};

export type CategoryT = {
    id: string,
    title: string,
};

export const CategorySchema: Schema = {
    type: 'object',
    attributes: {
        id: 'string',
        title: 'string',
    },
};

export type LinkT = {
    id: string,
    url: string,
    fetchedContent: mixed,
    tags: { [key: string]: boolean },
    description: mixed,
    completed: ?number,
    added: number,
};

export const LinkSchema: Schema = {
    type: 'object',
    attributes: {
        id: 'string',
        url: 'string',
        fetchedContent: 'any',
        tags: { type: 'map', value: 'boolean' },
        description: 'any',
        completed: { type: 'optional', value: 'number' },
        added: 'number',
    },
};

// export type Comment
// export type Reaction = {
//     id: string,
// }

const colorsRaw =
    '1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf';
export const colors = [];
for (let i = 0; i < colorsRaw.length; i += 6) {
    colors.push('#' + colorsRaw.slice(i, i + 6));
}
