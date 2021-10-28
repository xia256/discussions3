import Vue from 'vue';
import Vuex from 'vuex';
import { KeyManager } from '../KeyManager';

Vue.use(Vuex);

function getDefaultState() {
    return {
        standalone: false, // standalone web page not part of the SPA
        keyManager: null,
        notificationCount: 0,
        hasUnreadMessages: false,
        account: {
            loggedIn: false,
            username: '',
            avatar: ''
        },
        dialogs: {
            // name: options
        },
        popovers: {
            // name: options
        },
        submittedPost: null,
        settings: getDefaultSettings(false)
    }
}

function getDefaultSettings(isLoggedIn) {
    return {
        allowNsfw: isLoggedIn ? true : false,
        blurNsfw: true,
        neutralEngagement: false,
        likeNotifications: true,
        blockedTags: []
    }
}

function loadInitialState() {
    const state = getDefaultState();

    try {
        const vuex = window.localStorage.getItem('vuex');
        if (vuex) {
            const { keyManager, account } = JSON.parse(vuex);

            if (keyManager) {
                state.keyManager = new KeyManager();
                state.keyManager.restoreKeys(keyManager);
            }

            if (account) {
                state.account.username = account.username;
                state.account.avatar = account.avatar;
            }

            console.log('Loaded state from local storage'); //, vuex);
        }
    }
    catch (ex) {
        console.error('Failed to restore state', ex);
    }

    return state;
}

function saveStatePlugin(store) {
    store.subscribe((mutation, state) => {
        if (mutation.type == 'setPopover') return;
        if (mutation.type == 'setDialog') return;

        const serializedState = {
            keyManager: state.keyManager?.keys,
            account: {
                username: state.account?.username,
                avatar: state.account?.avatar
            }
        };

        const vuex = JSON.stringify(serializedState);

        window.localStorage.setItem('vuex', vuex);
        //console.log('Saved state to local storage'); //, vuex);
    });
}

export default new Vuex.Store({
    state: loadInitialState(),
    plugins: [saveStatePlugin],
    getters: {
        getState: state => {
            return name => {
                return state[name];
            }
        },
        isLoggedIn: state => {
            if (!state.keyManager) return 0;
            if (!state.account) return 0;
            if (!state.account.username) return 0;
            return state.account.loggedIn ? 2 : 1;
        }
    },
    mutations: {
        set(state, [name, value]) {
            state[name] = value;
        },
        setDialog(state, [name, options]) {
            state.dialogs[name] = options;
        },
        setPopover(state, [name, options]) {
            state.popovers[name] = options;
        },
        setAccount(state, account) {
            state.account.username = account.username;
            state.account.avatar = account.avatar;
            state.account.loggedIn = true;

            // settings
            const { allowNsfw, blurNsfw, neutralEngagement, likeNotifications, blockedTags } = Object.assign(getDefaultSettings(true), account.settings ?? {});
            state.settings.allowNsfw = allowNsfw;
            state.settings.blurNsfw = blurNsfw;
            state.settings.neutralEngagement = neutralEngagement;
            state.settings.likeNotifications = likeNotifications;
            state.settings.blockedTags = blockedTags;
        },
        logout(state) {
            const defaultState = getDefaultState();
            state.keyManager = defaultState.keyManager;
            state.account = defaultState.account;
        }
    }
})