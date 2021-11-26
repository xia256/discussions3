import Vue from 'vue';
import VueRouter from 'vue-router';

import { waitFor } from "../utility";

import Popup from '../pages/Popup';
import ViewPostPage from '../pages/ViewPostPage';
import ProfilePage from '../pages/ProfilePage';
import WalletPage from '../pages/wallet/WalletPage';
import WalletAssetsPage from "../pages/wallet/WalletAssetsPage";
import WalletDepositPage from "../pages/wallet/WalletDepositPage";
import WalletWithdrawPage from "../pages/wallet/WalletWithdrawPage";
import WalletRecoverKeyPage from "../pages/wallet/WalletRecoverKeyPage";
import TagPage from '../pages/TagPage';
import ExplorePage from '../pages/ExplorePage';
import NotificationsPage from '../pages/NotificationsPage';
import MessengerPage from '../pages/MessengerPage';
import ModerationPage from '../pages/ModerationPage';
import CommunityPage from '../pages/CommunityPage';
import SearchPage from '../pages/SearchPage';
import ViewCommunityPage from '../pages/ViewCommunityPage';
import SettingsPage from '../pages/SettingsPage';
import ConsolePage from '../pages/ConsolePage';

// Standalone
import StandAloneCardPage from '../pages/standalone/CardPage';

import routes from "../server/routes";
const Components = {
    Popup,
    ViewPostPage,
    ProfilePage,
    WalletPage,
    WalletAssetsPage,
    WalletDepositPage,
    WalletWithdrawPage,
    WalletRecoverKeyPage,
    TagPage,
    ExplorePage,
    NotificationsPage,
    MessengerPage,
    ModerationPage,
    CommunityPage,
    ViewCommunityPage,
    SearchPage,
    SettingsPage,
    ConsolePage,
    // Standalone
    StandAloneCardPage
}

Vue.use(VueRouter);

function routerfy(r) {
    return {
        ...r,
        component: r.component ? Components[r.component] : undefined,
        children: r.children ? r.children.map(routerfy) : undefined
    };
}

const router = new VueRouter({
    mode: 'history',
    routes: routes.map(routerfy),
});

router.beforeEach(async (to, from, next) => {

    const $App = await waitFor(0, async () => window.$App);

    if (to.meta?.authenticated) {
        if (!$App.isLoggedIn) {
            return next({ name: 'explore' });
        }
    }

    return next();
});

router.afterEach(async (to) => {
    to;

    const $App = await waitFor(0, async () => window.$App);

    for (const name of Object.keys($App.dialogs))
        $App.closeDialog(name);

    for (const name of Object.keys($App.popovers))
        $App.closePopover(name);
});

export default router;