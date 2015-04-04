(function () {
    "use strict";

    navigator.serviceWorker.register("/sw.js", {scope: "/"})
        .then(function (registration) {
            // 登録成功
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }).catch(function (err) {
            // 登録失敗 :(
            console.log('ServiceWorker registration failed: ', err);
        });
})();
