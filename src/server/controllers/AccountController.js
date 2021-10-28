import { Controller, All, Get } from '@decorators/express';

import axios from 'axios';
import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { Strategy as RedditStrategy } from 'passport-reddit';

import { Api } from '../../utility/decorators';
import ServerConfig from "../server.config";
import { getDatabase } from "../mongodb";

import GatewayServer from "../gateways/GatewayServer";

const CONTROLLER_PATH = "/account";

@Controller(CONTROLLER_PATH)
class AccountController {
    constructor() {
        this.setupPassport();
    }

    setupPassport() {
        function passportOptions(value) {
            if (Object.values(value).some(o => !o)) return undefined;
            return value;
        }

        const strategies = {
            'twitter': TwitterStrategy,
            'discord': DiscordStrategy,
            'reddit': RedditStrategy,
        };

        for (const strategyName in ServerConfig.passport) {

            let options = passportOptions(ServerConfig.passport[strategyName]);
            if (!options) continue;

            const callbackURL = `${ServerConfig.url}${ServerConfig.api}${CONTROLLER_PATH}/passport/${strategyName}/callback`;
            options = { passReqToCallback: true, state: true, callbackURL, ...options };

            const StrategyType = strategies[strategyName];
            passport.use(new StrategyType(options, (...args) => this.passportAuthorize.apply(this, [strategyName, ...args])));

            console.log(`Added passport strategy for ${strategyName}`);
        }
    }

    @Get('/passport/:provider/redirect')
    async passportRedirect(req, res) {
        const { redirect } = JSON.parse(req.session.state);
        return res.redirect(`${redirect}?redirect=${redirect}`);
    }

    @Get('/passport/:provider/callback')
    async passportCallback(req, res, next) {
        const authenticate = passport.authenticate(req.params.provider, {
            failureRedirect: `${ServerConfig.api}${CONTROLLER_PATH}/passport/${req.params.provider}/redirect`,
            successRedirect: `${ServerConfig.api}${CONTROLLER_PATH}/passport/${req.params.provider}/redirect`,
            session: false
        });
        return authenticate(req, res, next);
    }

    @Api()
    @Get('/passport/:provider')
    async passport(req, res, next) {
        const { redirect, clientId } = req.unpack();
        const state = { redirect, clientId };
        req.session.state = JSON.stringify(state);

        const authenticate = passport.authenticate(req.params.provider);
        return authenticate(req, res, next);
    }

    async passportAuthorize(provider, req, accessToken, refreshToken, profile, done) {
        const { clientId } = JSON.parse(req.session.state);
        const oauth = {
            provider, accessToken, refreshToken, profile,
            id: '',
            username: '',
            avatar: '',
            updatedAt: Date.now()
        };

        if (provider == 'discord') {
            oauth.id = String(profile.id);
            oauth.username = `${profile.username}#${profile.discriminator}`;
            if (profile.avatar) {
                oauth.avatar = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
            }
        }
        else if (provider == 'twitter') {
            oauth.id = String(profile.id);
            oauth.username = profile.username;

            if (profile._json?.profile_image_url_https) {
                oauth.avatar = profile._json.profile_image_url_https;
            }
        }
        else if (provider == 'reddit') {
            oauth.id = String(profile.id);
            oauth.username = profile.name;

            if (profile._json?.icon_img) {
                oauth.avatar = profile._json.icon_img;
                const queryIndex = oauth.avatar.indexOf('?');
                if (queryIndex > -1)
                    oauth.avatar = oauth.avatar.substring(0, queryIndex);
            }

            //
            // this is not provided directly in the profile object
            // so we need to go and request it using their accessToken
            //

            const { data: { data: { children } } } = await axios.get('https://oauth.reddit.com/subreddits/mine/subscriber', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const subreddits = children
                .filter(c => c.kind == 't5')
                .map(c => c.data.display_name)
                .filter(s => s);

            profile.subreddits = subreddits;
        }

        if (profile.id) {
            const dbo = await getDatabase();
            const oauths = dbo.collection(ServerConfig.mongodb.collections.oauths);

            const { ok, value: oauthDocument } = await oauths.findOneAndUpdate(
                {
                    provider,
                    id: oauth.id
                },
                {
                    $setOnInsert: { createdAt: Date.now(), accounts: [] },
                    $set: { ...oauth }
                },
                {
                    upsert: true,
                    returnOriginal: false
                }
            );

            // set identitfy public keys
            if (ok && oauthDocument) {
                const identityPublicKeys = oauthDocument.accounts.map(a => a.identityPublicKey);
                const client = GatewayServer.getClientById(clientId);

                if (client) {
                    client.state.oauth = oauthDocument;
                    if (client.state.account?.identityPublicKey) {
                        client.push('connectOAuth', { id: oauth.id, provider: oauth.provider, username: oauth.username });
                    }
                    else {
                        if (identityPublicKeys && identityPublicKeys.length > 0) {

                            const accounts = dbo.collection(ServerConfig.mongodb.collections.accounts);
                            const identities = await accounts.find({ identityPublicKey: { $in: identityPublicKeys } }).toArray();
                            const trimmedIdentities = identities.map(({ identityPublicKey, username, encryptedMnemonic }) => ({ identityPublicKey, username, encryptedMnemonic }));

                            client.push('suggestLoginIdentities', { identities: trimmedIdentities });
                        }
                        else {
                            client.push('suggestRegister', {
                                oauth: { id: oauth.id, provider: oauth.provider },
                                username: oauth.username
                            });
                        }
                    }
                }
            }
        }

        return done(null, {});
    }

    @Api()
    @All('/')
    async test(req, res) {
        const args = req.unpack();
        return res.success(args);
    }
}

export default AccountController;