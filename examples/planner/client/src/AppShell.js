// @flow
import Container from '@material-ui/core/Container';
import ListItem from '@material-ui/core/ListItem';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { makeStyles } from '@material-ui/core/styles';
import * as React from 'react';
import type { Client, SyncStatus } from '../../../../packages/client-bundle';
import { useCollection } from '../../../../packages/client-react';
import type { Data } from './auth-api';
import Drawer from './Drawer';
import Items from './TodoList/Items';
import TopBar from './TopBar';

import { Route, Switch, useRouteMatch } from 'react-router-dom';

const AppShell = ({
    client,
    logout,
    host,
    auth,
    drawerItems,
    children,
}: {
    client: Client<SyncStatus>,
    logout: () => mixed,
    host: string,
    auth: ?Data,
    children: React.Node,
    drawerItems: React.Node,
}) => {
    const [menu, setMenu] = React.useState(false);
    const styles = useStyles();
    const match = useRouteMatch();

    return (
        <React.Fragment>
            <TopBar auth={auth} logout={logout} openMenu={() => setMenu(true)} />
            <Drawer
                pageItems={drawerItems}
                onClose={() => setMenu(false)}
                open={menu}
                auth={auth}
                logout={logout}
                client={client}
            />
            <Container maxWidth="sm" className={styles.container}>
                {children}
            </Container>
        </React.Fragment>
    );
};

const useStyles = makeStyles((theme) => ({
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
}));

export default AppShell;
