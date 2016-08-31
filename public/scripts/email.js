app.service("Email", function($uibModal) {
	this.address = function(email) {
		return $uibModal.open({
			animation: false,
			templateUrl: "dialogs/email.html",
			controller: "EmailCtrl",
			size: "lg",
			resolve: {
				email: function() {
					return email;
				}
			}
		}).result;
	};
});

app.controller("EmailCtrl", function ($scope, $uibModalInstance, $log, email) {
	$scope.sender = email.sender;
	$scope.password = email.password; // likely undefined;
	$scope.recipient = email.recipient;
	$scope.subject = email.subject;

	$scope.ok = function() {
		var result = {
			sender: $scope.sender + "@gmail.com",
			password: $scope.password,
			recipient: $scope.recipient || $scope.sender,
			subject: $scope.subject
		};
		$uibModalInstance.close(result);
	};

	$scope.cancel = function() {
		$uibModalInstance.dismiss("cancel");
	};

	$scope.appendDate = function() {
		var now = new Date();
		$scope.subject += " " + now.toLocaleDateString();
	};

	$scope.appendTime = function(field) {
		var now = new Date();
		$scope.subject += " " + now.toLocaleTimeString();
	};
});
