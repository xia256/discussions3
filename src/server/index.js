import express from 'express';
import ExpressSession from 'express-session';
import BodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import axios from 'axios';

import { tryConnectDatabase } from './mongodb';

import { attachControllers } from '@decorators/express';
import { TestController, AccountController } from "./controllers";
import { 
    UtilityGatewayController, 
    AccountGatewayController,
    ActionGatewayController,
    SearchGatewayController,
    CryptoGatewayController
} from "./gateways";

import ServerConfig from './server.config';
import GatewayServer from './gateways/GatewayServer';
//import { Mutex } from '../utility';

import routes from "./routes";

const DIST_INDEX_FILE = fs.readFileSync(`./dist/index.html`, `utf8`);
const BUILD_REVISION = require('child_process')
    .execSync('git rev-parse HEAD')
    .toString()
    .trim();

async function serveDistIndex(req, res) {
    const bots = new RegExp(ServerConfig.bots.join('|'), 'i');
    const agent = req.headers['user-agent'];

    if (!agent || req.query.rendertron || agent.match(bots)) {
        const url = `${ServerConfig.rendertron}/${ServerConfig.url}${req.path}`;
        console.log(`[rendertron] ${agent} - ${req.path}`);

        const { data } = await axios.get(url);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/html');
        return res.send(data);
    }
    else { 
        const header = `<script>window.__BUILD__ = "${BUILD_REVISION}"</script>`;
        let index = DIST_INDEX_FILE;
        index = index.replace(/<\/head>/, `${header}</head>`);

        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/html');
        return res.send(index);
    }
}

async function migrations() {

    //const { posts } = await gateway.getDBO();

    //const { result } = await posts.updateMany({}, { $set: { likes: [] } });
    //console.log(result);

    return true;
}

(async function main() {
    if (!await tryConnectDatabase((ex) => console.error(ex))) {
        return;
    }
    else {
        console.log(`Connected to mongodb at ${ServerConfig.mongodb.connection}`);
    }

    try {
        await migrations();
    }
    catch (ex) {
        return console.error(`Failed to process migrations`, ex);
    }

    function addRoute(route, path = '') {
        if (!route.children || route.redirect) {
            const fullPath = path + route.path;
            console.log(`Added route for ${fullPath}`);
            app.get(fullPath, (req, res, next) => {
                return serveDistIndex(req, res, next);
            });
        }

        if (route.children) {
            for (const child of route.children) {
                let fullPath = path + route.path;
                if (fullPath[fullPath.length - 1] != '/') {
                    fullPath += '/';
                }
                addRoute(child, fullPath);
            }
        }
    }

    const app = express();

    app.use(BodyParser.urlencoded({ extended: true }));
    app.use(BodyParser.json());
    app.use(ExpressSession({
        secret: ServerConfig.salt,
        resave: false,
        saveUninitialized: true,
    }));

    routes.forEach(r => addRoute(r));

    app.use(express.static(`./dist/`));

    const api = express.Router();

    attachControllers(api, [
        TestController,
        AccountController
    ]);

    app.use(ServerConfig.api, cors(), api);

    const server = new GatewayServer({
        UtilityGatewayController,
        AccountGatewayController,
        ActionGatewayController,
        SearchGatewayController,
        CryptoGatewayController
    });

    server.listen(app, ServerConfig.port);

    console.log(`Listening on http://localhost:${ServerConfig.port}/`);

})();