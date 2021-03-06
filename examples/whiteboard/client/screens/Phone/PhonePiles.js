// @flow
/* @jsx jsx */
import { jsx } from '@emotion/core';
import React from 'react';
import Alea from 'alea';

import { type Collection } from '../../../../../packages/client-bundle';
import { type CardT, type SortT, type CommentT, colors } from '../../types';
import { useSpring, animated, interpolate } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import { Colors } from '../../Styles';

import { shuffle, CARD_HEIGHT, CARD_WIDTH } from '../Piles/AnimatedPiles';
import EditableTitle from '../Piles/EditableTitle';
import CardDetail from './CardDetail';
import { relativeTime } from '../../utils';

const Screen = ({
    col,
    cards,
    onDone,
    genId,
    sort,
    sortsCol,
    comments,
    commentsCol,
}: {
    onDone: () => void,
    col: Collection<CardT>,
    cards: { [key: string]: CardT },
    genId: () => string,
    sort: SortT,
    sortsCol: Collection<SortT>,
    comments: { [key: string]: CommentT },
    commentsCol: Collection<CommentT>,
}) => {
    const [detail, setDetail] = React.useState(null);
    if (detail) {
        return (
            <CardDetail
                card={cards[detail]}
                cardsCol={col}
                sort={sort}
                comments={comments}
                commentsCol={commentsCol}
                onClose={() => setDetail(null)}
            />
        );
    }
    return (
        <PhonePiles
            col={col}
            cards={cards}
            onDone={onDone}
            genId={genId}
            sort={sort}
            sortsCol={sortsCol}
            setDetail={setDetail}
        />
    );
};

const PhonePiles = ({
    col,
    cards,
    onDone,
    genId,
    sort,
    sortsCol,
    setDetail,
}: {
    onDone: () => void,
    col: Collection<CardT>,
    cards: { [key: string]: CardT },
    genId: () => string,
    sort: SortT,
    sortsCol: Collection<SortT>,
    setDetail: (string) => void,
}) => {
    const cardsInOrder = React.useMemo(() => {
        const rng = new Alea(sort.createdDate);
        const keys = Object.keys(cards);
        const sorted = keys
            .filter((k) => !!sort.cards[k])
            .sort((a, b) => sort.cards[a].placementTime - sort.cards[b].placementTime);
        const unsorted = shuffle(
            keys.filter((k) => !sort.cards[k]),
            rng,
        );
        return sorted.concat(unsorted);
    }, []);
    const pilesInOrder = Object.keys(sort.piles)
        .map((x) => +x)
        .sort();
    let top = 0;
    let firstCard = null;

    const topMargin = 50;
    const PILE_HEIGHT = Math.min(
        CARD_HEIGHT * 0.8,
        (window.innerHeight - CARD_HEIGHT - topMargin - 20) / pilesInOrder.length,
    );

    const countsPerPile = {};
    pilesInOrder.forEach((id) => (countsPerPile[id] = 0));
    Object.keys(sort.cards).forEach((id) => {
        countsPerPile[sort.cards[id].pile] += 1;
    });
    const numOfPile = { ...countsPerPile };

    const deckTop =
        (window.innerHeight - pilesInOrder.length * PILE_HEIGHT - topMargin) / 2 + topMargin;

    const positions = cardsInOrder.map((id, i) => {
        if (sort.cards[id]) {
            const num = numOfPile[sort.cards[id].pile];
            numOfPile[sort.cards[id].pile] -= 1;
            const SEP = 20;
            const total = (window.innerWidth - CARD_WIDTH) / SEP - 5;
            const at = Math.min(total, num);
            const dy = 10 / total;
            return {
                pos: [
                    (at + 2) * SEP + CARD_WIDTH / 2,
                    10 +
                        CARD_HEIGHT / 2 +
                        -(PILE_HEIGHT - 35) +
                        window.innerHeight -
                        PILE_HEIGHT * pilesInOrder.indexOf(sort.cards[id].pile) -
                        dy * at,
                ],
                num,
                pile: sort.cards[id].pile,
            };
        } else {
            if (firstCard === null) {
                firstCard = id;
            }
            const SEP = 50;
            const max = 100 + 6 * SEP;
            const off = Math.min(top, 5);
            const pos = off * SEP;
            top = Math.min(top + 1, 6);
            return {
                pos: [window.innerWidth - CARD_WIDTH / 2 - pos - 8, deckTop],
                at: top,
            };
        }
    });
    const springs = positions.map(({ pos }, i) => {
        return useSpring({ pos });
    });
    const { sorted, unsorted } = React.useMemo(() => {
        let sorted = 0;
        let unsorted = 0;
        Object.keys(cards).forEach((k) => {
            if (sort.cards[k] != null) {
                sorted += 1;
            } else {
                unsorted += 1;
            }
        });
        return { sorted, unsorted };
    }, [cards, sort]);

    const [focus, setFocus] = React.useState(null);

    if (focus != null) {
        const focusedCards = cardsInOrder.filter(
            (id) => sort.cards[id] && sort.cards[id].pile === focus,
        );
        return (
            <div css={styles.container}>
                <div
                    css={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: Colors.pink,
                    }}
                >
                    <button
                        css={{
                            cursor: 'pointer',
                            border: 'none',
                            padding: 16,
                            marginRight: 16,
                            backgroundColor: 'transparent',
                        }}
                        onClick={() => setFocus(null)}
                    >
                        ╳
                    </button>
                    <div
                        css={{
                            fontSize: '2em',
                            padding: '8px 16px',
                        }}
                    >
                        {sort.piles[focus].title}
                    </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {focusedCards.map((id) => (
                        <div
                            key={id}
                            style={{
                                display: 'flex',
                            }}
                        >
                            <div style={{ flex: 1, padding: 8 }} onClick={() => setDetail(id)}>
                                <div css={styles.title}>{cards[id].title}</div>
                                <div>{cards[id].description}</div>
                            </div>
                            <button
                                css={{
                                    cursor: 'pointer',
                                    border: 'none',
                                    padding: 16,
                                    marginRight: 16,
                                    backgroundColor: 'transparent',
                                }}
                                onClick={() => sortsCol.clearAttribute(sort.id, ['cards', id])}
                            >
                                ╳
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div css={styles.container}>
            <div css={{ textAlign: 'center', padding: 16, color: Colors.offBlack }}>
                <a href="/#" css={styles.backArrow}>
                    →
                </a>
                <div>{sort.title}</div>
            </div>
            <div>
                {positions.map((pos, i) => (
                    <animated.div
                        key={cardsInOrder[i]}
                        css={styles.card}
                        onClick={() => {
                            if (sort.cards[cardsInOrder[i]]) {
                                sortsCol.clearAttribute(sort.id, ['cards', cardsInOrder[i]]);
                            } else {
                                setDetail(cardsInOrder[i]);
                            }
                        }}
                        style={{
                            outline: pos.at === 1 ? `2px solid ${Colors.darkPink}` : null,
                            transform: springs[i].pos.interpolate(
                                (x, y) => `translate(${x}px, ${y}px)`,
                            ),
                            zIndex:
                                pos.pile != null
                                    ? (pilesInOrder.length - pilesInOrder.indexOf(pos.pile)) * 2 + 1
                                    : pos.at != null
                                    ? 6 - pos.at
                                    : undefined,
                        }}
                    >
                        <div css={styles.title}>{cards[cardsInOrder[i]].title}</div>
                        <div>{cards[cardsInOrder[i]].description}</div>
                    </animated.div>
                ))}
            </div>
            <div
                css={{
                    zIndex: 10,
                    position: 'absolute',
                    top: deckTop - (CARD_HEIGHT / 2) * 1.1,
                    left: 0,
                    textAlign: 'center',
                    width: 120,
                    height: CARD_HEIGHT * 1.1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '2px 2px 4px #ccc',
                    fontWeight: 'bold',
                    color: Colors.offBlack,
                    backgroundColor: Colors.pink,
                    border: `1px solid ${Colors.darkPink}`,
                }}
            >
                Miller Card Sort
                {sort.completedDate == null ? (
                    unsorted === 0 ? (
                        <button
                            css={{
                                backgroundColor: Colors.darkPink,
                            }}
                            onClick={() => {
                                sortsCol.setAttribute(sort.id, ['completedDate'], Date.now());
                            }}
                        >
                            Complete
                        </button>
                    ) : (
                        <div css={{ fontSize: '80%', marginTop: 8, fontWeight: 200 }}>
                            {'' + unsorted} / {'' + (sorted + unsorted)}
                        </div>
                    )
                ) : (
                    <div>Completed {relativeTime(sort.completedDate)}</div>
                )}
            </div>
            <div>
                {pilesInOrder.map((id, i) => (
                    <div
                        key={id}
                        css={styles.pile}
                        onClick={() => {
                            if (firstCard) {
                                sortsCol.setAttribute(sort.id, ['cards', firstCard], {
                                    pile: +id,
                                    placementTime: Date.now(),
                                });
                            }
                        }}
                        style={{
                            zIndex: (pilesInOrder.length - i) * 2,
                            bottom: i * PILE_HEIGHT,
                            height: PILE_HEIGHT,
                        }}
                    >
                        <div css={styles.pileTitle}>
                            <div
                                css={{
                                    width: '1.5em',
                                    textAlign: 'center',
                                    backgroundColor: Colors.darkPink,
                                    borderRadius: 4,
                                    marginRight: 8,
                                }}
                            >
                                {countsPerPile[id]}
                            </div>
                            {sort.piles[id].title}
                            <div style={{ flex: 1 }} />
                            <button
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    padding: 8,
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    setFocus(id);
                                }}
                            >
                                ↗️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    card: {
        transition: '.2s ease outline-color',
        overflow: 'hidden',
        textAlign: 'center',
        flexShrink: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: 'white',
        padding: 8,
        border: '1px solid #ccc',
        margin: 8,
        position: 'absolute',
        userSelect: 'none',
        top: 0,
        left: 0,
        marginTop: -CARD_HEIGHT / 2,
        marginLeft: -CARD_WIDTH / 2,
    },

    container: {
        overflow: 'hidden',
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    pileTitle: {
        display: 'flex',
        flexDirection: 'row',
        fontWeight: 'bold',
        marginBottom: 8,
        fontSize: '1.2em',
        textAlign: 'left',
        padding: '4px 8px',
    },

    pile: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        backgroundColor: Colors.lightPink,
        borderTop: `1px solid ${Colors.offBlack}`,
    },

    title: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    backArrow: {
        position: 'absolute',
        top: 0,
        left: 0,
        fontSize: 32,
        transform: `scaleX(-1)`,
        textDecoration: 'none',
        padding: '4px 16px',
    },
};

export default Screen;
