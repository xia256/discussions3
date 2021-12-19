let _started = false;

export default class LocalStorageConsole {
    static start() {
        if ( _started) return;
        _started = true;

        window.localStorage['_lsconsole'] = 'enabled';

        const log = console.log;
        console.log = function (...args) {
            let logStr = window.localStorage['_lsconsolelog'] ?? '';
            if (logStr.length < 50000) {
                let str = '';
                for (let i = 0; i < args.length; i++) {
                    if (args[i] == null)
                        str += 'null';
                    else if (args[i] == undefined)
                        str += 'undefined';
                    else
                        str += args[i].toString(); //JSON.stringify(args[i]);
                    str += ' ';
                }
                logStr += `[${(new Date().toLocaleString())}] ${str}\r\n`;
                window.localStorage['_lsconsolelog'] = logStr;
            }

            log.apply(this, args);
        }
    }
    static stop() {
        _started = false;
        window.localStorage['_lsconsole'] = '';
        window.localStorage['_lsconsolelog'] = '';
    }
}

if (typeof window != 'undefined') {
    const enabled = window.localStorage['_lsconsole'];
    if (enabled) {
        LocalStorageConsole.start();
    }
}