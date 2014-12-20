// λ.js :
// amazing template engine
window.λ_fill = (function () {
    var lparen = /^\(/, rparen = /^\)/, lambda = /^(\\|λ)/, arrow = /^(->|→)/, dot = /^\./,
        escape = /^\\/, identifier = /^[\w_]/, runOther = /^#/;
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
        return this[id] = this[id] || fill(document.getElementById(id).textContent);
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
        var hasNext = function (want) {
            return want.test(template.substr(i));
        };
        var maybeGet = function (want) {
            if (hasNext(want)) {
                get(want);
                return true;
            } else return false;
        };

        function parseToken() {
            var out = "";
            while (identifier.test(template[i]) && i < template.length)
                out += template[i++];
            return out;
        }

        function parseExpression(escape) {
            var depth = 1, out = "";
            maybeGet(lparen);
            while (true) {
                if (i >= template.length) return out;
                if (hasNext(lparen))++depth;
                if (hasNext(rparen))--depth;
                if (depth === 0) break;
                if (hasNext(lambda)) {
                    if(template[i+1] === escape) i++;
                    else {
                        out += "'+" + parseLambda() + "+'";
                        continue;
                    }
                }
                var chr = template[i++];
                if(escape) chr = chr.replace(/(['"\\])/, "\\$1").replace(/\n/,"\\n\\\n");
                out += chr;
            }
            get(rparen);
            return out;
        }

        function wrapExpression() {
            return "function(val,key){with(val){return '" + parseExpression(true) + "'}}";
        }

        function parseLambda() {
            get(lambda);
            var variable;
            if (hasNext(lparen))
                return "(" + parseExpression(false) + ")";
            if (maybeGet(runOther))
                return "λ_fill('"+parseToken()+"')({"+parseExpression(false)+"})";
            var out = parseToken();
            while (true) {
                if (maybeGet(arrow)) out = "_map(" + out + "," + wrapExpression() + ")";
                else if (maybeGet(dot)) {
                    out += "." + parseToken();
                } else if(hasNext(lparen)) out += "(" + parseExpression(false) + ")";
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
        [].forEach.call(document.querySelectorAll("script[type='text/tmpl'],script[type=λ]"), function (t) {
            t.outerHTML = λ_fill(t.textContent)(window);
        });
    };
    return fill;
}());
if(window["λ_auto"]) λ_fill.auto();
