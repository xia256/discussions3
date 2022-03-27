export default [
    {
        path: '/',
        component: 'ExplorePage',
        name: "explore",
    },
    {
        path: '/standalone/card',
        component: 'StandAloneCardPage',
        name: "standalonecard"
    },
    {
        path: '/vote/:proposalId?',
        component: 'VotePage',
        name: "vote"
    },
    {
        path: '/console',
        component: 'ConsolePage',
    },
    {
        path: '/popup',
        component: 'Popup'
    },
    {
        path: '/p/:username/:encodedId/:title?',
        component: 'ViewPostPage',
        name: "viewpost"
    },
    {
        path: '/u/:username',
        component: 'ProfilePage',
        name: "profile"
    },
    {
        path: '/wallet',
        component: 'WalletPage',
        redirect: '/wallet/assets',
        name: 'wallet',
        children: [
            {
                path: 'assets',
                component: 'WalletAssetsPage',
                name: "assets"
            },            
            {
                path: 'deposit',
                component: 'WalletDepositPage',
                name: "deposit"
            },            
            {
                path: 'withdraw',
                component: 'WalletWithdrawPage',
                name: "withdraw"
            },
            {
                path: 'recoverkey',
                component: 'WalletRecoverKeyPage',
                name: 'recoverkey'
            }
        ]
    },
    {
        path: '/tag/:hashtag',
        component: 'TagPage',
        name: "tag2"
    },
    {
        path: '/t/:hashtag',
        component: 'TagPage',
        name: "tag"
    },
    {
        path: '/c/:communityName',
        component: 'ViewCommunityPage',
        name: 'viewcommunity'
    },
    {
        path: '/search',
        component: 'SearchPage',
        name: 'search'
    },
    {
        path: '/notifications',
        component: 'NotificationsPage',
        name: 'notifications',
        meta: {
            authenticated: true
        }
    },
    {
        path: '/messenger/:contactName?',
        component: 'MessengerPage',
        name: 'messenger',
        meta: {
            authenticated: true,
            hideRight: true
        }
    },
    {
        path: '/moderation',
        component: 'ModerationPage',
        name: 'moderation',
        meta: {
            authenticated: true
        }
    },
    {
        path: '/community',
        component: 'CommunityPage',
        name: 'community',
        meta: {
            authenticated: true
        }
    },
    {
        path: '/settings',
        component: 'SettingsPage',
        name: 'settings',
        meta: {
            authenticated: true
        }
    }
];