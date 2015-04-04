(function (global) {
    function delegate(self, opts) {
        console.log(global);
        console.log(self);

        opts = opts || {};
        opts.dest = opts.dest || "/scripts/bundle.js";
        opts.files = opts.files || ["/scripts/main.js"];
        opts.dependencies = opts.dependencies || {
            "jquery": {
                "registry": "ajax.googleapis.com",
                "version": "2.1.3"
            }
        };
        opts.resolver = opts.resolver || {
            "ajax.googleapis.com": function (name, dep) {
                return Promise.resolve({
                    url: "https://ajax.googleapis.com/ajax/libs/" + name + "/" + dep.version + "/jquery.js"
                });
            }
        };

        // NOTE access-control-allow-origin: * 返してくれるCDNが必要

        self.onfetch = function (fetchEvent) {
            var requestURL = new URL(fetchEvent.request.url);
            if (requestURL.pathname == opts.dest) {
                var promises = Object.keys(opts.dependencies).map(function (libName) {
                    var dep = opts.dependencies[libName];
                    var resolver = opts.resolver[dep.registry];
                    return Promise.resolve(resolver(libName, dep))
                        .then(function (info) {
                            if (info.url) {
                                return fetch(info.url, {mode: "cors"})
                                    .then(function (res) {
                                        return res.text();
                                    });
                            } else if (info.content) {
                                return info.content;
                            } else {
                                return Promise.reject(libName + " is not contains content info");
                            }
                        });
                });
                promises = promises.concat(opts.files.map(function (scriptPath) {
                    return fetch(scriptPath)
                        .then(function (res) {
                            return res.text();
                        });
                }));

                var p = Promise.all(promises)
                    .then(function (texts) {
                        return texts.join("\n// ------ concat by pmw ------\n\n");
                    })
                    .then(function (code) {
                        return new Response(code);
                    });
                fetchEvent.respondWith(p);

                return;
            }
            // 何もしないとネットワークリクエストにフォールバック
        };
    }

    global.pmw = {
        delegate: delegate
    };
})(this);
