// @flow
/** @jsx jsx */
import { jsx } from '@emotion/core';
import React from 'react';

import { type Collection, type Client, type SyncStatus } from '../../../../packages/client-bundle';
import { type CardT, type SortT, colors } from '../types';
import { Colors } from '../Styles';
import { useSyncStatus } from '../../../../packages/client-react';
import gravatarUrl from 'gravatar-url';

import { makeDefaultCards } from '../defaults';
import { relativeTime } from '../utils';

const basicPiles = [
    'Most important',
    'Very important',
    'Important',
    'Less important',
    'Not important',
];
const timePiles = ['Hours per day', 'Daily', 'Weekly', 'Monthly', 'Less than monthly', 'N/A'];
const amountPiles = [
    'More than I want',
    'About as much as I want',
    'A bit less than I want',
    'Much less than I want',
    'N/A',
];

const conflictedPiles = ['Very conflicted', 'A little conflicted', 'Not conflicted'];

const respectPiles = [
    'Lots of respect',
    'Some respect',
    'Indifferent',
    'Some disrespect',
    'Strong disrespect',
];

const stockTitles = [
    { title: 'What I value', piles: basicPiles },
    { title: 'What I want to value', piles: basicPiles },
    { title: 'How I spend my time', piles: timePiles },
    { title: 'How I spend my time (relative)', piles: amountPiles },
    { title: 'What I have in life', piles: amountPiles },
    { title: 'How conflicted I am', piles: conflictedPiles },
    { title: 'How much I respect this in others', piles: respectPiles },
];

const CreateSort = ({
    sortsCol,
    genId,
    openSort,
}: {
    genId: () => string,
    sortsCol: Collection<SortT>,
    openSort: (string) => void,
}) => {
    const [title, setTitle] = React.useState(null);
    if (title === null) {
        return (
            <button
                css={{
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    fontSize: 'inherit',
                    padding: 16,
                    display: 'block',
                    width: '100%',
                    border: 'none',
                    transition: '0.3s ease background-color',

                    ':hover': {
                        backgroundColor: Colors.darkPink,
                    },
                }}
                onClick={() => {
                    setTitle(0);
                }}
            >
                Create new Sort
            </button>
        );
    }
    return (
        <div
            css={{
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
            }}
        >
            {typeof title === 'number' ? (
                <select
                    value={title}
                    css={{
                        fontSize: 'inherit',
                        margin: 6,
                        marginBottom: 7,
                        flex: 1,
                        border: 'none',
                        // padding: 8,
                    }}
                    onChange={(evt) => {
                        if (evt.target.value === '') {
                            setTitle(evt.target.value);
                        } else {
                            setTitle(+evt.target.value);
                        }
                    }}
                >
                    {stockTitles.map((stock, i) => (
                        <option value={i} key={i}>
                            {stock.title}
                        </option>
                    ))}
                    <option value="">Custom</option>
                </select>
            ) : (
                <input
                    value={title}
                    onChange={(evt) => setTitle(evt.target.value)}
                    placeholder="Title"
                    autoFocus
                    css={{
                        // textAlign: 'center',
                        margin: 0,
                        padding: 8,
                        flex: 1,
                        border: 'none',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                    }}
                />
            )}
            <button
                css={styles.button}
                style={{ marginLeft: 8, backgroundColor: '#8fa' }}
                onClick={() => {
                    if (typeof title === 'string' && !title.length) {
                        return;
                    }
                    const newTitle = typeof title === 'number' ? stockTitles[title].title : title;
                    const id = genId();
                    const piles = {};
                    const pileNames =
                        typeof title === 'number' ? stockTitles[title].piles : basicPiles;
                    pileNames.forEach((title, i) => (piles[i] = { title, color: colors[i] }));
                    sortsCol.save(id, {
                        id,
                        title: newTitle,
                        cards: {},
                        createdDate: Date.now(),
                        completedDate: null,
                        // $FlowFixMe
                        piles,
                    });
                    setTitle(null);
                    openSort(id);
                }}
            >
                Create
            </button>
            <button
                css={styles.button}
                style={{ marginLeft: 8, backgroundColor: '#f99' }}
                onClick={() => setTitle(null)}
            >
                Cancel
            </button>
        </div>
    );
};

const styles = {
    button: {
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        ':hover': {
            backgroundColor: '#eee',
        },
        fontSize: 'inherit',
        fontWeight: 'inherit',
    },
};

const Sorts = ({
    sorts,
    sortsCol,
    openSort,
    genId,
    status,
    user,
    logout,
}: {
    sorts: { [key: string]: SortT },
    sortsCol: Collection<SortT>,
    openSort: (string) => void,
    genId: () => string,
    status: SyncStatus,
    user: ?{ name: string, email: string },
    logout: () => mixed,
}) => {
    return (
        <div
            css={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {user ? (
                <div
                    css={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}
                >
                    <img
                        src={gravatarUrl(user.email)}
                        css={{
                            borderRadius: '50%',
                            width: 50,
                            height: 50,
                            marginRight: 8,
                        }}
                    />
                    <div>
                        <div>{user.name}</div>
                        <div
                            css={{
                                color: { connected: 'green', pending: '#aaa', disconnected: 'red' }[
                                    status.status
                                ],
                            }}
                        >
                            {status.status}
                        </div>
                        <button onClick={() => logout()}>logout</button>
                    </div>
                </div>
            ) : null}
            <div
                css={{
                    maxWidth: '100%',
                    width: 800,
                    maxHeight: '100%',
                    height: 800,
                    border: `2px solid ${Colors.pink}`,
                    borderRadius: 24,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 1,
                    overflow: 'hidden',
                }}
            >
                <h1
                    css={{
                        backgroundColor: Colors.pink,
                        margin: 0,
                        padding: '8px 0',
                    }}
                >
                    My Sorts
                </h1>
                <div css={{ overflow: 'auto', flex: 1, fontSize: 32 }}>
                    <CreateSort genId={genId} sortsCol={sortsCol} openSort={openSort} />
                    {Object.keys(sorts)
                        .filter((k) => sorts[k])
                        .sort((a, b) => sorts[b].createdDate - sorts[a].createdDate)
                        .map((key) => (
                            <div
                                css={{
                                    cursor: 'pointer',
                                    ':hover': {
                                        backgroundColor: Colors.darkPink,
                                    },
                                    transition: '.3s ease background-color',
                                    display: 'flex',
                                    padding: 16,
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                                key={key}
                                onClick={() => openSort(key)}
                            >
                                <div>{sorts[key].title}</div>
                                <div
                                    css={{ fontSize: 16 }}
                                    title={
                                        `Created ${new Date(sorts[key].createdDate).toString()}` +
                                        (sorts[key].completedDate != null
                                            ? '\nCompleted ' +
                                              new Date(sorts[key].completedDate).toString()
                                            : '')
                                    }
                                >
                                    {sorts[key].completedDate != null
                                        ? 'Completed ' + relativeTime(sorts[key].completedDate)
                                        : 'Incomplete, started ' +
                                          relativeTime(sorts[key].createdDate)}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

const HomePage = ({
    cards,
    cardsCol,
    sorts,
    sortsCol,
    openSort,
    genId,
    client,
    user,
    logout,
}: {
    client: Client<SyncStatus>,
    cards: { [key: string]: CardT },
    cardsCol: Collection<CardT>,
    sorts: { [key: string]: SortT },
    sortsCol: Collection<SortT>,
    openSort: (string) => void,
    genId: () => string,
    user: ?{ name: string, email: string },
    logout: () => mixed,
}) => {
    const status = useSyncStatus(React, client);

    if (!Object.keys(cards).length) {
        return (
            <Welcome
                onStart={() => {
                    makeDefaultCards(genId).forEach((card) => cardsCol.save(card.id, card));
                }}
            />
        );
    }
    return (
        <Sorts
            logout={logout}
            status={status}
            user={user}
            sorts={sorts}
            sortsCol={sortsCol}
            openSort={openSort}
            genId={genId}
        />
    );
};

const Welcome = ({ onStart }: { onStart: () => void }) => {
    return (
        <div
            css={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <h1>Welcome to the Miller Card Sort!</h1>
            <h4>Instructions</h4>
            <ul>
                <li>Drag cards around</li>
                <li>Hover a card &amp; press a number or letter key to "tag" the card</li>
                <li>Click a tag to select all cards with that tag</li>
                <li>
                    use shift+1, shift+2, and shift+3 to organize selected cards into 1, 2 or 3
                    columns
                </li>
            </ul>
            <button
                css={{
                    marginTop: 32,
                    fontSize: '2em',
                    border: 'none',
                    backgroundColor: '#0af',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                }}
                onClick={onStart}
            >
                Click here to get started
            </button>
        </div>
    );
};
export default HomePage;
