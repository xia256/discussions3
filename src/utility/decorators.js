import { KeyManager } from "../KeyManager";

function Api() {
    return function (target, name, descriptor) {
        let fn = descriptor.value;
        let newFn = async function (req, res) {

            res.success = (result, { cacheControl, contentType } = { contentType: 'application/json'/*, cacheControl: 'no-cache'*/ }) => {
                if (cacheControl)
                    res.setHeader('Cache-Control', cacheControl);

                res.setHeader('Content-Type', contentType);

                if (contentType == 'application/json') {
                    res.send(JSON.stringify({
                        payload: result ? result : {}
                    }));
                }
                else {
                    res.send(result);
                }
            }

            res.error = (err) => {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache');

                res.send(JSON.stringify({
                    error: true,
                    message: err.message
                }));
            }

            req.unpack = (defaultObject = {}) => {
                const unpacked = {};
                Object.assign(unpacked, defaultObject);
                Object.assign(unpacked, req.params);
                Object.assign(unpacked, req.query);
                Object.assign(unpacked, req.body);
                return unpacked;
            }

            req.unpackAuthenticated = (defaultObject) => {
                let { sig, data } = req.unpack();
                let { pub, time, domain, ...rest } = JSON.parse(data);

                const realData = {};
                Object.assign(realData, defaultObject);
                Object.assign(realData, rest);

                const recoveredKey = KeyManager.recoverTextKey(sig, data);
                if (recoveredKey != pub) {
                    throw new Error(`Recovered key ${recoveredKey} does not match supplied key ${pub}`);
                }

                const clockDelta = Date.now() - time;
                if (Math.abs(clockDelta) > 60000) {
                    throw new Error(`Clock delta was ${clockDelta}. Signature must be within a 60 second threshold, it's possible your system clock is out of sync.`);
                }

                return {
                    pub, sig, time, domain,
                    _data: data,
                    data: realData
                };
            }

            try {
                await fn.apply(this, arguments);
            }
            catch (ex) {
                console.log(ex);
                res.error(ex);
            }
        };

        descriptor.value = newFn;
        return descriptor;
    }
}

export { Api };