(function () {
    "use strict";

    // jQueryが使える！
    $(document).ready(function () {
        // angularが使える！
        angular.module("app", []).controller("TestController", function ($scope) {
            $scope.name = "vvakame";
        });

        angular.bootstrap(document, ["app"])
    });
})();
