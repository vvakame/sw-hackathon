(function (global) {

    // TODO fetchで帰ってきた結果が200かチェック

    function delegate(self, opts) {
        console.log(global);
        console.log(self);

        opts = opts || {};
        opts.dest = opts.dest || "/scripts/bundle.js";
        opts.files = opts.files || ["/scripts/main.js"];
        opts.dependencies = opts.dependencies || {};
        opts.resolver = opts.resolver || {
            "ajax.googleapis.com": ajaxGoogleApisResolver,
            "npm": npmRegistryResolver
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

        // 時すでに遅し
        self.addEventListener("activate", function (e) {
            e.waitUntil(self.clients.claim());
        });
    }

    function ajaxGoogleApisResolver(name, dep) {
        var url = "https://ajax.googleapis.com/ajax/libs/" + name + "/" + dep.version + "/" + name;
        if (dep.minify) {
            url += ".min.js"
        } else {
            url += ".js"
        }
        return Promise.resolve({
            url: url
        });
    }

    var gunzipLibLoaded = false;

    function npmRegistryResolver(name, dep) {
        if (!gunzipLibLoaded) {
            importScripts("/node_modules/zlibjs/bin/gunzip.min.js");
        }

        var url = "http://registry.npmjs.org/" + name + "/-/" + name + "-" + dep.version + ".tgz"
        return fetch(url, {mode: "cors"})
            .then(function (res) {
                return res.blob();
            })
            .then(function (blob) {
                return decompressTgz(blob);
            })
            .then(function (tar) {
                return decompressTar(tar);
            })
            .then(function (files) {
                var mainJs;
                if (dep.main) {
                    mainJs = dep.main;
                } else {
                    if (!files["package/package.json"]) {
                        return Promise.reject("package.json is not exists");
                    }
                    var content = String.fromCharCode.apply(null, files["package/package.json"]);
                    var packageInfo = JSON.parse(content);
                    if (!packageInfo.main) {
                        return Promise.reject("package.json not contains main property");
                    }
                    mainJs = packageInfo.main;
                }

                var code = files["package/" + mainJs];
                if (!code) {
                    return Promise.reject("package not contains " + mainJs);
                }

                var s = "";
                for (var i = 0; i < code.length; i++) {
                    s += String.fromCharCode(code[i]);
                }
                return s;
            })
            .then(function (code) {
                return {
                    content: code
                };
            });
    }


    function decompressTgz(blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var bytes = new Uint8Array(reader.result);
                var gunzip = new Zlib.Gunzip(bytes);
                var plain = gunzip.decompress();
                resolve(plain);
            };
            reader.readAsArrayBuffer(blob);
        });
    }

    function decompressTar(bytes /* UInt8Array */) {
        // from https://github.com/turbulenz/turbulenz_engine/blob/8f9ffd245fb05782352db959be0a979bbb7b6f1b/tslib/webgl/tarloader.ts#L34

        var offset = 0;
        var totalSize = bytes.length;

        function skip(limit) {
            offset += limit;
        }

        function getString(limit) {
            var index = offset;
            var nextOffset = (index + limit);
            var c = bytes[index];
            var ret;
            if (c && 0 < limit) {
                index += 1;
                var s = new Array(limit);
                var n = 0;
                do
                {
                    s[n] = c;
                    n += 1;

                    c = bytes[index];
                    index += 1;
                }
                while (c && n < limit);
                // remove padding whitespace
                while (s[n - 1] === 32) {
                    n -= 1;
                }
                s.length = n;
                ret = String.fromCharCode.apply(null, s);
            }
            else {
                ret = '';
            }
            offset = nextOffset;
            return ret;
        }

        function getNumber(text) {
            text = text.replace(/[^\d]/g, '');
            return parseInt('0' + text, 8);
        }

        var header = {
            fileName: null,
            //mode : null,
            //uid : null,
            //gid : null,
            length: 0,
            //lastModified : null,
            //checkSum : null,
            fileType: null,
            //linkName : null,
            ustarSignature: null,
            //ustarVersion : null,
            //ownerUserName : null,
            //ownerGroupName : null,
            //deviceMajor : null,
            //deviceMinor : null,
            fileNamePrefix: null
        };

        function parseHeader(header) {
            header.fileName = getString(100);
            skip(8);//header.mode = getString(8);
            skip(8);//header.uid = getString(8);
            skip(8);//header.gid = getString(8);
            header.length = getNumber(getString(12));
            skip(12);//header.lastModified = getString(12);
            skip(8);//header.checkSum = getString(8);
            header.fileType = getString(1);
            skip(100);//header.linkName = getString(100);
            header.ustarSignature = getString(6);
            skip(2);//header.ustarVersion = getString(2);
            skip(32);//header.ownerUserName = getString(32);
            skip(32);//header.ownerGroupName = getString(32);
            skip(8);//header.deviceMajor = getString(8);
            skip(8);//header.deviceMinor = getString(8);
            header.fileNamePrefix = getString(155);
            offset += 12;
        }

        var result = {};

        while ((offset + 512) <= totalSize) {
            parseHeader(header);
            if (0 < header.length) {
                var fileName;
                if (header.fileName === "././@LongLink") {
                    // name in next chunk
                    fileName = getString(256);
                    offset += 256;

                    parseHeader(header);
                } else {
                    if (header.fileNamePrefix &&
                        header.ustarSignature === "ustar") {
                        fileName = (header.fileNamePrefix + header.fileName);
                    }
                    else {
                        fileName = header.fileName;
                    }
                }
                if ('' === header.fileType || '0' === header.fileType) {
                    result[fileName] = bytes.subarray(offset, (offset + header.length));
                }
                offset += (Math.floor((header.length + 511) / 512) * 512);
            }
        }

        return result;
    }

    global.pmw = {
        delegate: delegate
    };
})(this);
