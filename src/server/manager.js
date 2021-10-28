import { argv } from 'yargs';
import { spawn } from 'child_process';
import { delay } from "../utility";

(async function () {
    const queue = [
        { name: `s`, cmd: `npm run ${argv.server}` }
    ];

    for (; ;) {

        if (queue.length == 0) {
            await delay(10000);
            continue;
        }

        const { name, cmd } = queue.pop();
        const p = spawn(cmd, { shell: true, detached: true });
        
        p.on('exit', function (code, signal) {
            console.log(`[${name}] process exited with code ${code} and signal ${signal}`);
            queue.push({ name, cmd });
        });

        p.stdout.on('data', (data) => {

            if (data.indexOf('Terminate batch job') > -1) {
                console.log(new Date());
                p.kill();
            }

            console.log(`[${name}] ${data}`);
        });

        p.stderr.on('data', (data) => {
            console.error(`[${name}] ${data}`);
        });

        await delay(1000);
    }
})();