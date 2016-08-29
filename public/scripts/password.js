app.service("Password", function($uibModal) {
	this.challenge = function(extra) {
		if (angular.isUndefined(extra)) {
			extra = { };
		}
		return $uibModal.open({
			animation: false,
			templateUrl: "dialogs/password.html",
			controller: "PasswordCtrl",
			resolve: {
				extra: function() {
					return extra;
				}
			}
		}).result;
	};
});

app.controller("PasswordCtrl", function ($scope, $uibModalInstance, $timeout, extra) {
	$scope.extra = angular.copy(extra);
	$scope.password = undefined;
	if (angular.isDefined(extra.title)) {
		$scope.title = extra.title;
	} else if (angular.isDefined(extra.for)) {
		$scope.title = "Enter Password for " + extra.for;
	} else {
		$scope.title = "Enter Password";
	}

	if (angular.isDefined($scope.extra.timeout)) {
		$scope.autoClose = $timeout(function() {
			$scope.cancel("timeout");
		}, $scope.extra.timeout);
	} else {
		$scope.autoClose = undefined;
	}

	function cleanup() {
		if (angular.isDefined($scope.autoClose)) {
			$timeout.cancel($scope.autoClose);
		}
	}

	$scope.ok = function() {
		cleanup();
		var result = { password: $scope.password };
		if (angular.isDefined($scope.extra)) {
			result[$scope.extra.field] = $scope.extra.value;
		}
		$uibModalInstance.close(result);
	};

	$scope.cancel = function(reason) {
		cleanup();
		$uibModalInstance.dismiss(reason || "cancel");
	};
});
