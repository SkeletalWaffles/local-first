// @flow
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import Chip from '@material-ui/core/Chip';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';
import AddBoxOutlined from '@material-ui/icons/Add';
import Folder from '@material-ui/icons/Folder';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import * as React from 'react';
import type { Client, Collection, SyncStatus } from '../../../../packages/client-bundle';
import { useItem } from '../../../../packages/client-react';
import { type ItemT, newItem } from './types';

const INDENT = 24;

export const NewItem = ({ onAdd, level }: { onAdd: (string) => void, level: number }) => {
    const [text, setText] = React.useState('');
    const styles = useStyles();

    return (
        <div className={styles.inputWrapper} style={{ paddingLeft: level * INDENT }}>
            <IconButton
                style={{ padding: 9 }}
                onClick={() => {
                    if (text.trim().length > 0) {
                        onAdd(text);
                        setText('');
                    }
                }}
            >
                <AddBoxOutlined />
            </IconButton>
            <input
                type="text"
                value={text}
                onChange={(evt) => setText(evt.target.value)}
                placeholder="Add item"
                className={styles.input}
                onKeyDown={(evt) => {
                    if (evt.key === 'Enter' && text.trim().length > 0) {
                        onAdd(text);
                        setText('');
                    }
                }}
            />
        </div>
    );
};

export const ItemChildren = ({
    item,
    level,
    client,
    col,
}: {
    item: ItemT,
    level: number,
    client: Client<SyncStatus>,
    col: Collection<ItemT>,
}) => {
    const styles = useStyles();
    return (
        <div className={styles.itemChildren}>
            {item.children.map((child) => (
                <Item level={level + 1} id={child} key={child} client={client} />
            ))}
            <NewItem
                level={level + 1}
                onAdd={(text) => {
                    const childId = client.getStamp();
                    col.save(childId, newItem(childId, text));
                    col.insertId(item.id, ['children'], item.children.length, childId);
                }}
            />
        </div>
    );
};

type Props = { level: number, id: string, client: Client<SyncStatus> };

export const Item = React.memo<Props>(({ id, client, level }: Props) => {
    const [col, item] = useItem(React, client, 'items', id);
    const [open, setOpen] = React.useState(id === 'root');
    const [editing, setEditing] = React.useState(null);
    const styles = useStyles();

    const [menu, setMenu] = React.useState(false);
    const [anchorEl, setAnchorEl] = React.useState(null);

    if (!item) {
        return <div>deleted...</div>;
    }

    const menuItems = [{ title: 'Edit text', onClick: () => setEditing(item.title) }];
    if (item.children.length === 0 && !open) {
        menuItems.push({ title: 'Add child', onClick: () => setOpen(true) });
    }
    if (item.style === 'group') {
        menuItems.push({
            title: 'Convert to checkbox',
            onClick: () => {
                col.setAttribute(id, ['style'], null);
            },
        });
    } else {
        menuItems.push({
            title: 'Convert to group',
            onClick: () => {
                col.setAttribute(id, ['style'], 'group');
            },
        });
    }

    return (
        <div className={styles.itemWrapper}>
            <div
                className={styles.item}
                style={{ paddingLeft: level * INDENT }}
                // onClick={() => setOpen(!open)}
                // umm so what do we do
            >
                {item.style === 'group' ? (
                    <div style={{ padding: 9 }} onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                    </div>
                ) : (
                    <Checkbox
                        // type="checkbox"
                        checked={!!item.completedDate}
                        onChange={() => {
                            col.setAttribute(
                                id,
                                ['completedDate'],
                                item.completedDate != null ? null : Date.now(),
                            );
                        }}
                        onClick={(evt) => evt.stopPropagation()}
                    />
                )}
                <div className={item.style === 'group' ? styles.groupTitle : styles.itemTitle}>
                    {editing != null ? (
                        <input
                            autoFocus
                            className={styles.input}
                            onClick={(evt) => evt.stopPropagation()}
                            value={editing}
                            onChange={(evt) => setEditing(evt.target.value)}
                            onKeyDown={(evt) => {
                                if (evt.key === 'Enter' && editing.trim().length > 0) {
                                    col.setAttribute(id, ['title'], editing);
                                    setEditing(null);
                                }
                            }}
                            // onBlur={() => setEditing(null)}
                        />
                    ) : (
                        item.title
                    )}
                </div>

                {!open && item.children.length > 0 ? <Chip label={item.children.length} /> : null}

                <IconButton
                    aria-label="more"
                    // aria-controls="long-menu"
                    aria-haspopup="true"
                    onClick={(evt) => {
                        evt.stopPropagation();
                        setMenu(true);
                    }}
                    ref={setAnchorEl}
                >
                    <MoreVertIcon />
                </IconButton>
                <Menu
                    id="long-menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={menu}
                    onClick={(evt) => evt.stopPropagation()}
                    onClose={() => setMenu(false)}
                >
                    {menuItems.map((item) => (
                        <MenuItem
                            key={item.title}
                            onClick={() => {
                                item.onClick();
                                setMenu(false);
                            }}
                        >
                            {item.title}
                        </MenuItem>
                    ))}
                </Menu>
            </div>
            {open ? <ItemChildren item={item} level={level} client={client} col={col} /> : null}
        </div>
    );
});

const useStyles = makeStyles((theme) => ({
    container: {},
    input: {
        color: 'inherit',
        width: '100%',
        fontSize: 32,
        padding: '4px 8px',
        backgroundColor: 'inherit',
        border: 'none',
        borderBottom: `2px solid ${theme.palette.primary.dark}`,
    },
    inputWrapper: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        '&:hover': {
            backgroundColor: theme.palette.primary.light,
        },
    },
    itemWrapper: {},
    item: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        cursor: 'pointer',
        // padding: `${theme.spacing(1)}px ${theme.spacing(3)}px`,
        '&:hover': {
            backgroundColor: theme.palette.primary.light,
        },
    },
    groupTitle: {
        flex: 1,
        // padding: theme.spacing(2),
        ...theme.typography.h3,
        color: theme.palette.primary.dark,
    },
    itemTitle: {
        flex: 1,
        // padding: theme.spacing(2),
        ...theme.typography.h4,
    },
    itemChildren: {
        // paddingLeft: theme.spacing(2),
    },
}));
