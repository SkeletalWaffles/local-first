// @flow

const listeners = [];

export const initialStatus = (): Status => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
        try {
            const { user, token } = JSON.parse(raw);
            if (!user || !token) {
                throw new Error(`Unexpected data`);
            }
            console.log('initial loaded status', user, token);
            return { user, token };
        } catch {
            return false;
        }
    } else {
        return false;
    }
};

export const listen = (fn) => {
    listeners.push(fn);
    return () => {
        const idx = listeners.indexOf(fn);
        if (idx !== -1) {
            listeners.splice(idx, 1);
        }
    };
};

export const checkEmail = async (host: string, email: string) => {
    // TODO figure out what the behavior is here if we're offline
    const res = await fetch(
        `${
            window.location.protocol
        }//${host}/api/check-login?email=${encodeURIComponent(email)}`,
    );
    return res.status >= 200 && res.status < 300;
};

const processResponse = async (res, sentToken) => {
    if (res.status !== 200 && res.status !== 204) {
        throw new Error(await res.text());
    }
    const token = sentToken || res.headers.get('X-Session');
    if (!token) {
        localStorage.removeItem(storageKey);
        listeners.forEach((fn) => fn(false));
        return null;
    }
    const user = await res.json();
    const auth = { user, token };
    localStorage.setItem(storageKey, JSON.stringify(auth));
    listeners.forEach((fn) => fn(auth));
    return auth;
};

export const getUser = async (host: string, token: string) => {
    // TODO figure out what the behavior is here if we're offline
    let res;
    try {
        res = await fetch(`${window.location.protocol}//${host}/api/user`, {
            headers: { Authorization: `Bearer: ${token}` },
        });
    } catch {
        return false;
    }
    if (res.status === 401) {
        localStorage.removeItem(storageKey);
        listeners.forEach((fn) => fn(false));
        throw new Error(`Not logged in`);
    }
    return processResponse(res, token);
};

export const logout = async (host: string, token: string) => {
    // TODO figure out what the behavior is here if we're offline
    const res = await fetch(`${window.location.protocol}//${host}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer: ${token}` },
    });
    return processResponse(res);
};

export const login = async (host, email, password) => {
    // TODO figure out what the behavior is here if we're offline
    const res = await fetch(`${window.location.protocol}//${host}/api/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return processResponse(res);
};

export const signup = async (host, email, password, name, invite) => {
    // TODO figure out what the behavior is here if we're offline
    const res = await fetch(`${window.location.protocol}//${host}/api/signup`, {
        method: 'POST',
        body: JSON.stringify({ email, password, name, invite }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return processResponse(res);
};

export const storageKey = `millder-card-sort-auth`;
