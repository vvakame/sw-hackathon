(function (global) {
    function delegate(self) {
        console.log(global);
        console.log(self);

        self.onfetch = function (fetchEvent) {
            console.log(fetchEvent);
            var requestURL = new URL(fetchEvent.request.url);
            if (requestURL.pathname == "/scripts/entry.js") {
                fetchEvent.respondWith(new Response("console.log('generated code by sw');"));
                return;
            }
            // 何もしないとネットワークリクエストにフォールバック
        };
    }

    global.pmw = {
        delegate: delegate
    };
})(this);
