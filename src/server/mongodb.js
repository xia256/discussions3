import { MongoClient } from 'mongodb';
import ServerConfig from './server.config';

let _connection = null;
let _database = null;

const _usernameResolver = {}; // username -> identity pub key
const _identityResolver = {}; // identity pub key -> username
let _lastIdentityTime = 0;

async function getDatabase() {
    if (!_connection) {
        const config = ServerConfig.mongodb;
        const connection = await MongoClient.connect(config.connection, { useNewUrlParser: true, useUnifiedTopology: true });
        const database = await connection.db(config.database);

        for (const collectionName in config.indexes) {
            for (const { $options, ...fieldOrSpec } of config.indexes[collectionName]) {
                console.log(`Database index on ${collectionName} ${JSON.stringify(fieldOrSpec)} ${$options ? JSON.stringify($options) : ''}`);
                await database.collection(collectionName).createIndex(fieldOrSpec, $options);
            }
        }

        _connection = connection;
        _database = database;
    }
    return _database;
}

async function updateUserIdentities() {
    const nowsub10min = Date.now() - (10 * 60000);

    const dbo = await getDatabase();
    const cursor = await dbo
        .collection(ServerConfig.mongodb.collections.accounts)
        .aggregate([
            {
                $match: { createdAt: { $gte: _lastIdentityTime } }
            },
            {
                $project: {
                    username: "$username",
                    identityPublicKey: "$identityPublicKey"
                }
            }
        ]);

    while (await cursor.hasNext()) {
        const { username, identityPublicKey } = await cursor.next();
        updateUserIdentity(username, identityPublicKey);
    }

    _lastIdentityTime = nowsub10min;
}

async function tryConnectDatabase(exceptionHandler) {
    try {
        await getDatabase();
        await updateUserIdentities();
        return true;
    }
    catch (ex) {
        if (exceptionHandler) exceptionHandler(ex);
        return false;
    }
}

function updateUserIdentity(username, identityPublicKey) {
    if (!username) return;
    if (!identityPublicKey) return;

    _usernameResolver[username.toLowerCase()] = identityPublicKey;
    _identityResolver[identityPublicKey] = username;
}

async function resolveToIdentities(usernames) {
    return usernames.map(un => _usernameResolver[un.toLowerCase()]);
}

async function resolveToUsernames(identityPublicKeys) {
    return identityPublicKeys.map(idpk => _identityResolver[idpk]);
}

export {
    getDatabase,
    tryConnectDatabase,
    updateUserIdentities,
    updateUserIdentity,
    resolveToIdentities,
    resolveToUsernames
}