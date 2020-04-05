// @flow
/* @jsx jsx */
import { jsx } from '@emotion/core';
import React from 'react';

import { type Collection } from '../../../../packages/client-bundle';
import { type CardT, type SortT, colors } from '../types';
import { useSpring, animated } from 'react-spring';

type State = {
    firstRef: { current: ?HTMLDivElement },
    piles: Array<{ title: string }>,
    cards: Array<Card>,
};

type Card = { x: number, y: number, id: string, pile?: ?number, tilt: number };

const initialState = (ids): State => ({
    firstRef: { current: null },
    piles: [
        { title: 'Most important' },
        { title: 'Very important' },
        { title: 'Important' },
        { title: 'Less important' },
        { title: 'Not important' },
    ],
    cards: ids.map((id) => ({
        id,
        x: Math.random() - 0.5,
        y: Math.random() - 0.5,
        tilt: Math.random() - 0.5,
    })),
});

const reduce = (state, action) => {
    const cards = state.cards.slice();
    cards[action.card] = {
        ...cards[action.card],
        pile: action.pile,
    };
    return {
        ...state,
        cards,
    };
    // }
};

const CARD_WIDTH = 200;
const CARD_HEIGHT = 100;

const shuffle = (array) => {
    return array
        .map((item) => [Math.random(), item])
        .sort((a, b) => a[0] - b[0])
        .map((item) => item[1]);
};

const PilesMode = ({
    col,
    cards,
    onDone,
    genId,
    sort,
    sortsCol,
}: {
    onDone: () => void,
    col: Collection<CardT>,
    cards: { [key: string]: CardT },
    genId: () => string,
    sort: SortT,
    sortsCol: Collection<SortT>,
}) => {
    const cardPositions = React.useMemo(() => {
        const keys = Object.keys(cards);
        const sorted = keys
            .filter((k) => !!sort.cards[k])
            .sort((a, b) => sort.cards[a].placementTime - sort.cards[b].placementTime);
        const unsorted = shuffle(keys.filter((k) => !sort.cards[k]));

        return sorted.concat(unsorted).map((id) => ({
            id,
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            tilt: Math.random() * 2 - 1,
        }));
    }, []);
    // const [state, dispatch] = React.useReducer(reduce, initial);
    const firstRef = React.useRef(null);
    const pilesInOrder = Object.keys(sort.piles)
        .sort()
        .map((id) => ({ id, pile: sort.piles[+id] }));

    const pilePositions = {};
    Object.keys(sort.piles).forEach((k) => {
        pilePositions[k] = React.useRef(null);
    });
    // pilesInOrder.map(() => React.useRef(null));

    const baseY = window.innerHeight / 2 - CARD_HEIGHT / 2;

    // const cardIds = Object.keys(cards)

    let leftPos = 0;
    const MARGIN = 24;
    let firstCard = null;
    const positions = cardPositions.map(({ x, y, tilt, id }, i) => {
        if (sort.cards[id] != null) {
            if (pilePositions[sort.cards[id].pile].current) {
                const pilePos = pilePositions[sort.cards[id].pile].current;
                return {
                    x: pilePos.x + (x * CARD_WIDTH) / 4,
                    y: pilePos.y + (y * CARD_HEIGHT) / 4,
                };
            }
            return { x: 0, y: 0 };
        }
        if (firstCard === null) {
            firstCard = id;
        }
        const xPos = window.innerWidth / 2 - CARD_WIDTH / 2 + leftPos * (CARD_WIDTH + MARGIN);
        const pos = {
            x: Math.min(xPos, window.innerWidth - CARD_WIDTH / 2),
            y: baseY,
        };
        leftPos += 1;
        return pos;
    });

    const springs = cardPositions.map((card, i) => {
        return useSpring({
            xyt: [positions[i].x, positions[i].y, sort.cards[card.id] != null ? card.tilt : 0],
            opacity: sort.cards[card.id] != null ? 0.8 : 1,
        });
    });

    const pileContainerRef = React.useRef(null);

    React.useEffect(() => {
        if (firstRef.current) {
            const div = firstRef.current;
            div.focus();
        }
    }, [firstRef.current, sort]);

    return (
        <div
            style={{
                overflow: 'hidden',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
        >
            <div>{sort.title}</div>
            <button
                onClick={() => {
                    sortsCol.setAttribute(sort.id, ['cards'], {});
                }}
            >
                Reset the sort
            </button>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                }}
            >
                {pilesInOrder.map(({ id, pile }, i) => (
                    <div
                        key={i}
                        ref={(node) => {
                            if (node) {
                                const box = node.getBoundingClientRect();
                                const pos = {
                                    y: box.top + box.height / 2,
                                    x: box.left + box.width / 2,
                                };
                                pilePositions[id].current = pos;
                            }
                        }}
                        style={{
                            padding: 8,
                            textAlign: 'center',
                        }}
                    >
                        <div style={styles.title}>{pile.title}</div>
                        <div
                            style={{
                                border: '1px solid #aaa',
                                width: CARD_WIDTH * 1.5,
                                height: CARD_HEIGHT * 2,
                                position: 'relative',
                            }}
                        />
                    </div>
                ))}
            </div>
            {cardPositions.map((item, i) => (
                <animated.div
                    key={item.id}
                    ref={item.id === firstCard ? (node) => (firstRef.current = node) : null}
                    tabIndex={item.id === firstCard ? '0' : null}
                    css={styles.card}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        marginTop: -CARD_HEIGHT / 2,
                        marginLeft: -CARD_WIDTH / 2,
                        opacity: springs[i].opacity,
                        transform: springs[i].xyt.interpolate(
                            (x, y, tilt) =>
                                `translate(${x}px, ${y}px) rotate(${parseInt(tilt * 15)}deg)`,
                        ),
                    }}
                    onKeyDown={(evt) => {
                        if (+evt.key == evt.key && sort.piles[+evt.key - 1]) {
                            // dispatch({ type: 'key', pile: +evt.key - 1, card: i });
                            sortsCol.setAttribute(sort.id, ['cards', item.id], {
                                pile: +evt.key - 1,
                                placementTime: Date.now(),
                            });
                        }
                    }}
                >
                    <div css={styles.title}>{cards[item.id].title}</div>
                    <div>{cards[item.id].description}</div>
                </animated.div>
            ))}
            <div
                style={{
                    position: 'absolute',
                    backgroundColor: 'aliceblue',
                    top: baseY,
                    left: window.innerWidth - (CARD_WIDTH * boxSize) / 2,
                    marginLeft: (-CARD_WIDTH / 2) * boxSize,
                    marginTop: (-CARD_HEIGHT / 2) * boxSize,
                    width: CARD_WIDTH * boxSize,
                    height: CARD_HEIGHT * boxSize,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    border: '1px solid #ccc',
                }}
            >
                Miller Value Sort
            </div>
        </div>
    );
};

const boxSize = 1.3;

const styles = {
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    card: {
        overflow: 'hidden',
        textAlign: 'center',
        flexShrink: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: 'white',
        padding: 8,
        // boxShadow: '0 0 3px #555',
        border: '1px solid #ccc',
        margin: 8,
    },
};

export default PilesMode;
