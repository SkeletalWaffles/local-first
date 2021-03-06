// @flow
import IconButton from '@material-ui/core/IconButton';
import { makeStyles } from '@material-ui/core/styles';
import Cancel from '@material-ui/icons/Cancel';
import * as React from 'react';
import type { Client, SyncStatus } from '../../../../../packages/client-bundle';
import { useItem } from '../../../../../packages/client-react';
import { Item } from '../TodoList/Item';
import type { OnDragRef, DragInit } from '../TodoList/dragging';

const path = [];
const setRootPath = () => {};

const ShowItem = ({
    client,
    id,
    onClear,
    onDragRef,
    onDragStart,
    idx,
}: {
    client: Client<SyncStatus>,
    id: string,
    onClear: () => mixed,
    onDragRef: OnDragRef,
    onDragStart: (DragInit) => void,
    idx?: number,
}) => {
    const [col, item] = useItem(React, client, 'items', id);
    const styles = useStyles();

    const show = React.useCallback((item) => true, []);

    if (item === false) {
        return null; // loading
    }

    if (item == null) {
        return (
            <div className={styles.item}>
                <div style={{ flex: 1 }}>Deleted</div>
                <IconButton onClick={onClear}>
                    <Cancel />
                </IconButton>
            </div>
        );
    }
    return (
        <div
            // onClick={onClick}
            className={styles.item}
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
            }}
        >
            <div style={{ flex: 1 }}>
                <Item
                    client={client}
                    item={item}
                    level={0}
                    show={show}
                    path={path}
                    onDragRef={onDragRef}
                    onDragStart={onDragStart}
                    setRootPath={setRootPath}
                    idx={idx || 0}
                />
            </div>
            <IconButton onClick={onClear}>
                <Cancel />
            </IconButton>
            {/* {item.title} */}
        </div>
    );
};

export default ShowItem;

const useStyles = makeStyles((theme) => ({
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
    title: {
        flexGrow: 1,
    },
    menuButton: {
        marginRight: theme.spacing(2),
    },
    root: {
        backgroundColor: theme.palette.background.paper,
        overflow: 'hidden',
    },
    body: {
        padding: theme.spacing(2),
    },
    topBar: {
        padding: theme.spacing(2),
        backgroundColor: theme.palette.primary.light,
        color: theme.palette.primary.contrastText,
    },
    userButton: {
        '& > span': {
            display: 'inline',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        textTransform: 'none',
        minWidth: 0,
    },
    item: {
        // cursor: 'pointer',
        flex: 1,
        padding: `${theme.spacing(1)}px ${theme.spacing(2)}px`,
        ...theme.typography.body1,
        fontWeight: 300,
        // margin: 5,
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'center',
        minHeight: 34,
        // '&:hover': {
        //     backgroundColor: theme.palette.primary.dark,
        // },
    },
    breadcrumb: {
        color: theme.palette.text.disabled,
    },
    link: {
        color: theme.palette.text.secondary,
    },
    today: {
        fontWeight: 'bold',
        padding: theme.spacing(2),
    },
    topLinks: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
}));
