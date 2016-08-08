var app = angular.module('App', [ 'ui.bootstrap' ]);

app.controller('DocumentStore', function DocumentStore($scope, $http, $uibModal) {
	$scope.getById = function(id) {
		return document.getElementById(id);
	}

	var contentStyle = window.getComputedStyle($scope.getById("content"));
	$scope.defaults = {
		text: {
			font: contentStyle.getPropertyValue('font-family'),
			size: parseFloat(contentStyle.getPropertyValue('font-size')),
			minSize: 10, // px
			maxSize: 50  // px
		}
	};
	$scope.text = JSON.parse(JSON.stringify($scope.defaults.text)); // hokey JS way to dupe an object
	$scope.development = true;
	$scope.settings = false;

	$scope.list = function(callback) {
		$http.get("/api/files/").then(
			function success(response) {
				callback(response.data);
			},
			function failure(response) {
				callback([ ]);
			}
		);
	};

	$scope.load = function(name) {
		$http.get("/api/files/" + encodeURIComponent(name)).then(
			function success(response) {
				$scope.name = name;
				$scope.content = response.data;
				$scope.size = response.headers("Content-Length");
				$scope.modified = new Date(Date.parse(response.headers("Last-Modified")));
				$scope.dirty = false;
				$scope.setFocus("content");
			},
			function failure(response) {
				$scope.reset();
			}
		);
	};

	$scope.save = function(name, content) {
		$http.put("/api/files/" + encodeURIComponent(name), content).then(
			function success(response) {
				console.log("saved " + name + " successfully!");
				$scope.dirty = false;
			},
			function failure(response) {
				console.log("saving " + name + " failed");
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
		$scope.getById(id).focus();
	};

	$scope.reset = function() {
		$scope.name = undefined;
		$scope.content = undefined;
		$scope.size = undefined;
		$scope.modified = undefined;
		$scope.dirty = false;
		$scope.setFocus("content");
	};

	$scope.open = function() {
		$scope.list(function(docs) {
			$scope.docs = docs;
		});

		var dlg = $uibModal.open({
			animation: false,
			templateUrl: 'docs.html',
			controller: 'OpenDocsCtrl',
			scope: $scope,
			size: 'lg'
		});

		dlg.result.then(function (selected) {
			$scope.load(selected);
		});
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

	$scope.enter_settings = function() {
		$scope.settings = true;
	};

	$scope.exit_settings = function() {
		$scope.settings = false;
	};

	$scope.text_size = function(delta) {
		if (delta == 0 || delta == undefined) {
			console.log("reset font size!");
			$scope.text.size = $scope.defaults.text.size;
		} else {
			$scope.text.size = Math.round($scope.text.size + delta);
			$scope.text.size = Math.max($scope.text.size, $scope.defaults.text.minSize);
			$scope.text.size = Math.min($scope.text.size, $scope.defaults.text.maxSize);
		}
	};

	$scope.confirm = function(title, message) {
		var dlg = $uibModal.open({
			animation: false,
			templateUrl: 'prompt.html',
			controller: 'PromptCtrl',
			resolve: {
				title: function() {
					return title;
				},
				message: function() {
					return message;
				}
			}
		});

		var ok = false;
		dlg.result.then(
			function() {
				ok = true;
			},
			function() {
				ok = false;
			}
		);

		return ok;
	};

	$scope.reset();
});

app.controller('OpenDocsCtrl', function ($scope, $uibModalInstance) {
	$scope.select = function(doc) {
		$uibModalInstance.close(doc.name);
	}

	$scope.delete = function(doc) {
		if ($scope.confirm("Confirm", "Deleting document '" + doc.name + "'. Are you sure?")) {
			// $scope.remove(doc.name);
			doc.removed = true;
		}
	}

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

app.controller('PromptCtrl', function ($scope, $uibModalInstance, title, message) {
	$scope.title = title;
	$scope.message = message;

	$scope.ok = function() {
		$uibModalInstance.close('ok');
	}

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});
