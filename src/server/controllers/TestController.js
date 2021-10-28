import { Controller, All } from '@decorators/express';
import { Api } from '../../utility/decorators';

import { delay } from "../../utility";

const CONTROLLER_PATH = "/test";

@Controller(CONTROLLER_PATH)
class TestController {
    constructor() {
    }

    @Api()
    @All('/waitrender')
    async waitRender(req, res) {
        const start = Date.now();
        //await delay(5000);
        delay;
        const end = Date.now();
        const delta = end - start;
        return res.success({ start, end, delta });
    }

    @Api()
    @All('/')
    async test(req, res) {
        const args = req.unpack();
        return res.success(args);
    }
}

export default TestController;