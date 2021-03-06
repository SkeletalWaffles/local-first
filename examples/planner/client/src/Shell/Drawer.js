// @flow

import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import AccountCircle from '@material-ui/icons/AccountCircle';
import ExitToApp from '@material-ui/icons/ExitToApp';
import Label from '@material-ui/icons/Label';
import LabelOutlined from '@material-ui/icons/LabelOutlined';
import GetApp from '@material-ui/icons/GetApp';
import Publish from '@material-ui/icons/Publish';
import * as React from 'react';
import type { Data } from '../auth-api';
import type { TagT } from '../types';
import {
    type Client,
    type SyncStatus,
    type Collection,
} from '../../../../../packages/client-bundle';
import { useCollection } from '../../../../../packages/client-react';
import EditTagDialog from './EditTagDialog';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';
import { Switch, Route, Link } from 'react-router-dom';
import { showDate, today } from '../utils';
import type { AuthData } from '../App';

const MyDrawer = ({
    open,
    onClose,
    authData,
    client,
    // auth,
    // logout,
    pageItems,
}: {
    client: Client<SyncStatus>,
    open: boolean,
    onClose: () => void,
    authData: ?AuthData,
    // logout: () => mixed,
    // auth: ?Data,
    pageItems: React.Node,
}) => {
    const [tagsCol, tags] = useCollection(React, client, 'tags');
    const [editTag, setEditTag] = React.useState(false);
    const [dialog, setDialog] = React.useState(null);

    return (
        <React.Fragment>
            <Drawer anchor={'left'} open={open} onClose={onClose}>
                <List>
                    {authData ? (
                        <ListItem>
                            <ListItemIcon>
                                <AccountCircle />
                            </ListItemIcon>
                            <ListItemText primary={authData.auth.user.email} />
                        </ListItem>
                    ) : (
                        <ListItem button>
                            <ListItemIcon>
                                <AccountCircle />
                            </ListItemIcon>
                            <ListItemText primary="Sign in" />
                        </ListItem>
                    )}
                    <Divider />
                    {pageItems}
                    <Divider />
                    <ListItem button component={Link} to="/">
                        Home
                    </ListItem>
                    <ListItem button component={Link} to={`/day/${showDate(today())}`}>
                        Today's Schedule
                    </ListItem>
                    <ListItem button component={Link} to={`/split/${showDate(today())}`}>
                        Today's Schedule (split)
                    </ListItem>
                    <ListItem button component={Link} to={`/habits`}>
                        Habits &amp; recurring tasks
                    </ListItem>
                    <Divider />
                    <ListItem button onClick={() => setDialog('export')}>
                        <ListItemIcon>
                            <GetApp />
                        </ListItemIcon>
                        <ListItemText primary="Export all data" />
                    </ListItem>
                    <ListItem button onClick={() => setDialog('import')}>
                        <ListItemIcon>
                            <Publish />
                        </ListItemIcon>
                        <ListItemText primary="Import" />
                    </ListItem>
                    <Divider />
                    {Object.keys(tags).map((k) => (
                        <ListItem button onClick={() => setEditTag(tags[k])} key={k}>
                            <ListItemIcon>
                                <Label />
                            </ListItemIcon>
                            <ListItemText primary={tags[k].title} />
                        </ListItem>
                    ))}
                    <ListItem button onClick={() => setEditTag(null)}>
                        <ListItemIcon>
                            <LabelOutlined />
                        </ListItemIcon>
                        <ListItemText primary="New Tag" />
                    </ListItem>
                    <Divider />
                    {authData ? (
                        <ListItem button onClick={authData.logout}>
                            <ListItemIcon>
                                <ExitToApp />
                            </ListItemIcon>
                            <ListItemText primary="Sign out" />
                        </ListItem>
                    ) : null}
                </List>
                <Divider />
            </Drawer>
            <ExportDialog
                open={dialog === 'export'}
                client={client}
                onClose={() => setDialog(null)}
            />
            <ImportDialog
                open={dialog === 'import'}
                client={client}
                onClose={() => setDialog(null)}
            />
            {editTag !== false ? (
                <EditTagDialog
                    client={client}
                    tagsCol={tagsCol}
                    tag={editTag}
                    onClose={() => setEditTag(false)}
                />
            ) : null}
        </React.Fragment>
    );
};

export default MyDrawer;
