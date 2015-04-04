(function () {
    "use strict";

    if (typeof window !== "undefined") {
        // window context
        navigator.serviceWorker.register("/sw.js", {scope: "/"})
            .then(function (registration) {
                // 登録成功
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }).catch(function (err) {
                // 登録失敗 :(
                console.log('ServiceWorker registration failed: ', err);
            });
    } else {
        // service worker context
        importScripts("/pmw/sw.js");
        pmw.delegate(self, {
            dest: "/scripts/bundle.js",
            files: [
                "/scripts/main.js"
            ],
            dependencies: {
                "jquery": {
                    "registry": "ajax.googleapis.com",
                    "version": "2.1.3",
                    "minify": true
                }
            },
            resolver: {
                "ajax.googleapis.com": function (name, info) {
                    var url = "https://ajax.googleapis.com/ajax/libs/" + name + "/" + info.version + "/" + name;
                    if (info.minify) {
                        url += ".min.js"
                    } else {
                        url += ".js"
                    }
                    return Promise.resolve({
                        url: url
                    });
                }
            }
        });
    }
})();
