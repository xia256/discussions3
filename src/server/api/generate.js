import fs from "fs";
import * as gateways from "../gateways";
import ServerConfig from "../server.config";

function generateGateways() {
    const getMethods = (obj) => Object.getOwnPropertyNames(obj).filter(item => {
        try { 
            return typeof obj[item] === 'function'; 
        }
        catch (ex) { 
            return false; 
        }
    });

    const output = {};

    for (const GatewayType of Object.values(gateways)) {
        output[GatewayType.name] = {};
        for (const method of getMethods(GatewayType.prototype)) {
            output[GatewayType.name][method] = `${GatewayType.name}.${method}`;
        }
    }
    
    fs.writeFileSync(__dirname + '/gateways.json', JSON.stringify(output, null, 2), 'utf8');
}

function generateServerConfig() {
    const copyConfig = JSON.parse(JSON.stringify(ServerConfig));

    for (const key of copyConfig.$private) {
        const indices = key.split('.');
        let obj = copyConfig;
        for (let i = 0; i < indices.length - 1; i++)
            obj = obj[indices[i]];
        obj[indices[indices.length - 1]] = ''; // redact
    }

    delete (copyConfig.$private);
    fs.writeFileSync(__dirname + '/config.json', JSON.stringify(copyConfig, null, 2), 'utf8');
}

(function main() {

    generateGateways();
    generateServerConfig();

})();