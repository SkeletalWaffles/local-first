// @flow
import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import { makeStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import MenuIcon from '@material-ui/icons/Menu';
import * as React from 'react';
import type { Data } from './auth-api';

const TopBar = ({
    auth,
    setDialog,
    openMenu,
    logout,
}: {
    auth: ?Data,
    openMenu: () => void,
    setDialog: ('export' | 'import') => void,
    logout: () => mixed,
}) => {
    const styles = useStyles();

    return (
        <AppBar position="sticky">
            <Toolbar>
                <IconButton
                    edge="start"
                    className={styles.menuButton}
                    color="inherit"
                    aria-label="menu"
                    onClick={openMenu}
                >
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" className={styles.title}>
                    Planner
                </Typography>
            </Toolbar>
        </AppBar>
    );
};

const useStyles = makeStyles((theme) => ({
    title: {
        flexGrow: 1,
    },
    menuButton: {
        marginRight: theme.spacing(2),
    },
}));

export default TopBar;
