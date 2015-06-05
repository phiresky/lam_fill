// λ.js: amazing template engine
// https://github.com/phiresky/lam_fill
(function () {
	var lambda_name = window['lambda_fn_name'] || "λ_fill";
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
        autoQuery: "script[type='text/tmpl'],script[type=λ]",
    };
	var origcfg = {};
	for(var k in cfg) origcfg[k] = cfg[k];
    var cache = {};
	var cacheGet = function(id) {
        if(!cache[id]) {
            var ele = document.getElementById(id);
            if(!ele) throw "Can't find element with id "+id;
            cache[id] = fill(ele.textContent);
        }
        return cache[id];
    };
    // λ_fill() :: template -> (data -> html)  
    // λ_fill() :: template, data -> html
    var fill = function (template) {
		if(arguments.length > 1) {
			return fill(template).apply(null,[].slice.call(arguments,1));
		}
        if(template.length > 0 && !/\W/.test(template)) {
           // interpret as id if has only word characters
           return cacheGet(template);
        }
        var i = 0;
        var get = function (want) {
            var got = want.exec(template.substr(i));
            if (!got) throw "got " + template.substr(i,7) + "..., expected " + want;
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

		function escape_chr(chr) {
			return chr.replace(/(['"\\])/, "\\$1").replace(/\n/,"\\n\\\n");
		}

        function parseExpression(escape) {
            var depth = 1, out = "";
            maybeGet(cfg.lparen);
            while (true) {
                if (i >= template.length) return out;
                if (hasNext(cfg.lparen))++depth;
                if (hasNext(cfg.rparen))--depth;
                if (depth === 0) break;
				var iBefore = i;
                if (maybeGet(cfg.lambda)) {
                    if(hasNext(cfg.lambda)) {
						// escaped, ignore
						for(var k=iBefore; k < i; k++) {
							var chr = template[k];
							if(escape) chr = escape_chr(chr);
							out += chr;
						}
					} else {
						i = iBefore;
                        out += "'+" + parseLambda() + "+'";
                        continue;
                    }
                }
                var chr = template[i++];
                if(escape) chr = escape_chr(chr);
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
			if(out.length == 1 && (!isNaN(+out))) out = "arguments["+(+out)+"]";
            while (true) {
                if (maybeGet(cfg.arrow)) {
					get(cfg.lparen);
                    out = "λ_fill._map(" + out + "," + wrapExpression() + ")";
                } else if (maybeGet(cfg.dot)) {
                    out += "." + parseToken();
                } else if(hasNext(cfg.lparen)) out += "(" + parseExpression(false) + ")";
                else if(maybeGet(cfg.question)) {
                    var iftrue = parseExprOrToken();
                    var iffalse = "";
                    if(maybeGet(cfg.trinarySep)) iffalse = parseExprOrToken();
                    out = '((typeof ('+out+')!== "undefined") && '+out+")?('"+iftrue+"'):('"+iffalse+"')";
                }
                else return "λ_fill._join(" + out + ")";
            }
        }
        eval("var fn = " + wrapExpression());
        return fn;
    }
    fill._map = function(o, fn) { // objects dont have a map function
        if (o.map) return o.map(fn);
        return Object.keys(o).map(function (key) {
            return fn(o[key], key);
        });
    };
    fill._join = function(x) {
        if (x instanceof Array) return x.join("");
        else return x;
    };
                 
    fill.inplace = function(id, data) {
        document.getElementById(id).outerHTML = "<div id='"+id+"'>"+cacheGet(id)(data)+"</div>";
    }
    fill.auto = function() {
        // automatically parse and replace <script type=λ> tags
        [].forEach.call(document.querySelectorAll(cfg.autoQuery), function (t) {
			if(t.id) fill.inplace(t.id, window);
            else t.outerHTML = fill(t.textContent, window);
        });
    };
	fill.config = function(things) {
		for(var what in things) {
			cfg[what] = new RegExp("^("+(things[what].source||things[what])+")");
		}
	};
	fill.resetConfig = function() {
		for(var k in origcfg) cfg[k] = origcfg[k];
	};
	window[lambda_name] = fill;
}());
