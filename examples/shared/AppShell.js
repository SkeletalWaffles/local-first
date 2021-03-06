// @flow
import Container from '@material-ui/core/Container';
import { makeStyles } from '@material-ui/core/styles';
import * as React from 'react';
import type { Client, SyncStatus } from '../../packages/client-bundle';
import { useCollection } from '../../packages/client-react';
import type { Data } from './auth-api';
import TopBar from './TopBar';
import type { AuthData } from './Auth';

import { Route, Switch, useRouteMatch } from 'react-router-dom';

const AppShell = ({
    client,
    authData,
    drawerItems,
    children,
    noContainer,
    renderDrawer,
    title,
    topIcons,
}: {
    client: Client<*>,
    authData: ?AuthData,
    children: React.Node,
    drawerItems: React.Node,
    noContainer?: boolean,
    renderDrawer: (boolean, () => void) => React.Node,
    title: string,
    topIcons?: React.Node,
}) => {
    const [menu, setMenu] = React.useState(false);
    const styles = useStyles();
    const match = useRouteMatch();

    const openMenu = React.useCallback(() => setMenu(true), []);

    return (
        <React.Fragment>
            <TopBar openMenu={openMenu} client={client} title={title} icons={topIcons} />
            {renderDrawer(menu, () => setMenu(false))}
            <Container maxWidth={noContainer ? undefined : 'md'} className={styles.container}>
                {children}
            </Container>
        </React.Fragment>
    );
};

const useStyles = makeStyles(theme => ({
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
}));

export default AppShell;
