// λ.js :
// amazing template engine
window.λ_fill = (function () {
    var cfg = {
        lparen: /^\(/,
        rparen: /^\)/,
        lambda: /^(\\|λ)/,
        arrow: /^(->|→)/,
        dot: /^\./,
        escape: /^\\/,
        identifier: /^[\w_]/,
        runOther: /^#/,
        question: /^\?/,
        trinarySep: /^:/,
        autoQuery: "script[type='text/tmpl'],script[type=λ]"
    };
    function _map(o, fn) { // objects dont have a map function
        if (o.map) return o.map(fn);
        return Object.keys(o).map(function (key) {
            return fn(o[key], key);
        });
    };
    function _join(x) {
        if (x instanceof Array) return x.join("");
        else return x;
    };
    var cache = {get:function(id) {
        if(!this[id]) {
            var ele = document.getElementById(id);
            if(!ele) throw "Can't find element with id "+id;
            this[id] = fill(ele.textContent);
        }
        return this[id];
    }};
    // λ_fill :: template -> (data -> html)  
    var fill = function (template) {
        if(!/\W/.test(template)) {
           // interpret as id
           return cache.get(template);
        }
        var i = 0;
        var get = function (want) {
            var got = want.exec(template.substr(i));
            if (!got) throw "got " + got + ", wanted " + want;
            i += got[0].length;
            return got;
        };
        // can read cfg.? at current position
        var hasNext = function (want) {
            return want.test(template.substr(i));
        };
        var maybeGet = function (want) {
            if (hasNext(want)) {
                get(want);
                return true;
            } else return false;
        };

        // parse and return single token (e.g. variable name)
        function parseToken() {
            var out = "";
            while (hasNext(cfg.identifier) && i < template.length)
                out += template[i++];
            return out;
        }

        function parseExpression(escape) {
            var depth = 1, out = "";
            maybeGet(cfg.lparen);
            while (true) {
                if (i >= template.length) return out;
                if (hasNext(cfg.lparen))++depth;
                if (hasNext(cfg.rparen))--depth;
                if (depth === 0) break;
                if (hasNext(cfg.lambda)) {
                    if(template[i+1] === cfg.escape) ++i;
                    else {
                        out += "'+" + parseLambda() + "+'";
                        continue;
                    }
                }
                var chr = template[i++];
                if(escape) chr = chr.replace(/(['"\\])/, "\\$1").replace(/\n/,"\\n\\\n");
                out += chr;
            }
            get(cfg.rparen);
            return out;
        }

        function wrapExpression() {
            return "function(val,key){with(val){return '" + parseExpression(true) + "'}}";
        }

        function parseExprOrToken() {
            if(hasNext(cfg.lparen)) return parseExpression(true);
            return parseToken();
        }

        function parseLambda() {
            get(cfg.lambda);
            var variable;
            if (hasNext(cfg.lparen))
                return "(" + parseExpression(false) + ")";
            if (maybeGet(cfg.runOther))
                return "λ_fill('"+parseToken()+"')({"+parseExpression(false)+"})";
            var out = parseToken();
            while (true) {
                if (maybeGet(cfg.arrow)) {
                    out = "_map(" + out + "," + wrapExpression() + ")";
                } else if (maybeGet(cfg.dot)) {
                    out += "." + parseToken();
                } else if(hasNext(cfg.lparen)) out += "(" + parseExpression(false) + ")";
                else if(maybeGet(cfg.question)) {
                    var iftrue = parseExprOrToken();
                    var iffalse = "";
                    if(maybeGet(cfg.trinarySep)) iffalse = parseExprOrToken();
                    out = '((typeof ('+out+')!== "undefined") && '+out+")?('"+iftrue+"'):('"+iffalse+"')";
                }
                else return "_join(" + out + ")";
            }
        }
        eval("var fn = " + wrapExpression());
        return fn;
    }
                 
    fill.inplace = function(id, data) {
        document.getElementById(id).outerHTML = "<div id='"+id+"'>"+cache.get(id)(data)+"</div>";
    }
    fill.auto = function() {
        // automatically parse and replace <script type=λ> tags
        [].forEach.call(document.querySelectorAll(cfg.autoQuery), function (t) {
            t.outerHTML = λ_fill(t.textContent)(window);
        });
    };
    fill.config = cfg;
    return fill;
}());
if(window["λ_auto"]) λ_fill.auto();
