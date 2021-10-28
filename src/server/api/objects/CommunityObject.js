export default class CommunityObject {
    static compileFilter(filterString) {
        const tokenize = (s) => s.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/);
        const atom = (token) => isNaN(token) ? token : parseFloat(token);

        function expression(tokens) {
            if (tokens.length == 0)
                throw new Error("Unexpected EOF while parsing");

            const token = tokens.shift();
            if ('(' == token) {
                const arr = [];
                while (')' != tokens[0])
                    arr.push(expression(tokens));
                tokens.shift();
                return arr;
            }
            else {
                if (')' == token)
                    throw new Error("Unexpected )");
                else
                    return atom(token);
            }
        }

        function compile(e) {
            if (typeof e == 'string') {
                if (e.startsWith('@'))
                    return { identityPublicKey: e.substring(1) };
                else if (e.startsWith('#'))
                    return { hashtags: e.substring(1) };
                else if (e.startsWith('*'))
                    return { community: e.substring(1) };
                else
                    throw new Error(`Unexpected string ${e}`);
            }
            else if (!Array.isArray(e)) throw new Error(`Unexpected expression is neither string or an array`);

            const [_op, ...rest] = e;
            const params = rest.map(re => compile(re));

            const op = _op.toUpperCase();
            if (op == 'OR') return { $or: params };
            else if (op == 'AND') return { $and: params };
            else if (op == 'NOT') return { $nor: params };
            else throw new Error(`Unknown operator ${op}`);
        }

        filterString = filterString.trim();
        let query = { $expr: false };

        // short hand syntax
        if (filterString.startsWith('@') || filterString.startsWith('#')) {
            filterString = `(OR ${filterString})`;
        }
        
        if (filterString) {
            query = compile(expression(tokenize(filterString)));
        }

        return {
            source: filterString,
            query: query
        };
    }

    constructor() {

    }
}