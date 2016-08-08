var app = angular.module('App', []);

app.controller('DocumentStore', function DocumentStore($scope, $http) {
	$scope.list = function() {
		$http.get("/api/files/").then(
			function success(response) {
				$scope.docs = response.data;
			},
			function failure(response) {
				$scope.docs = [ ];
			}
		);
	};

	$scope.get = function(name) {
		$http.get("/api/files/" + encodeURIComponent(name)).then(
			function success(response) {
				$scope.name = name;
				$scope.content = response.data;
				$scope.size = response.headers("Content-Length");
				$scope.modified = new Date(Date.parse(response.headers("Last-Modified")));
				$scope.dirty = false;
				$scope.close();
				$scope.setFocus("content");
			},
			function failure(response) {
				$scope.reset();
			}
		);
	};

	$scope.set = function(name, content) {
		$http.put("/api/files/" + encodeURIComponent($scope.doc.name), $scope.doc.content).then(
			function success(response) {
			},
			function failure(response) {
				$scope.reset();
			}
		);
	};

	$scope.remove = function(name) {
		$http.delete("/api/files/" + encodeURIComponent(name)).then(
			function success(response) {
			},
			function failure(response) {
				$scope.reset();
			}
		);
	};

	$scope.setDirty = function() {
		$scope.dirty = true;
	};

	$scope.setFocus = function(id) {
		window.document.getElementById(id).focus();
	};

	$scope.reset = function() {
		$scope.name = undefined;
		$scope.content = undefined;
		$scope.size = undefined;
		$scope.modified = undefined;
		$scope.dirty = false;
		$scope.close();
		$scope.setFocus("content");
	};

	$scope.open = function() {
		$scope.opening = true;
		$scope.list();
	};

	$scope.close = function() {
		$scope.opening = false;
		$scope.docs = [ ];
		$scope.setFocus("content");
	}

	$scope.save = function() {
		$scope.list();
	};

	$scope.reload = function() {
		window.location.reload();
	};

	$scope.quit = function() {
		$http.get("/api/quit");
	};

	$scope.shutdown = function() {
		$http.get("/api/shutdown");
	};

	$scope.docs = [ ];
	$scope.reset();
});
