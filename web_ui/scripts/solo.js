var app = angular.module('App', [ 'ui.bootstrap' ]);

app.controller('DocumentStore', function DocumentStore($scope, $http, $uibModal) {
	$scope.getById = function(id) {
		return document.getElementById(id);
	}

	var contentStyle = window.getComputedStyle($scope.getById("content"));
	$scope.modes = { main: 0, settings: 1 };
	$scope.defaults = {
		text: {
			fontFamily: contentStyle.getPropertyValue('font-family'),
			fontSize: parseFloat(contentStyle.getPropertyValue('font-size')),
			minSize: 10, // px
			maxSize: 50  // px
		},
		backgroundImage: true,
		mode: $scope.modes.main
	};
	$scope.settings = JSON.parse(JSON.stringify($scope.defaults)); // hokey JS way to dupe an object
	$scope.development = true;

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
				$scope.doc = {
					name: name,
					content: response.data,
					size: response.headers("Content-Length"),
					modified: new Date(Date.parse(response.headers("Last-Modified"))),
					dirty: false
				};
				$scope.setFocus("content");
				$scope.settings.backgroundImage = false;
			},
			function failure(response) {
				$scope.reset();
				$scope.setAlert("Failed to load document, reason: " + response);
			}
		);
	};

	$scope.save = function(name, content) {
		$http.put("/api/files/" + encodeURIComponent(name), content).then(
			function success(response) {
				$scope.doc.dirty = false;
			},
			function failure(response) {
				$scope.setAlert("Failed to save document, reason: " + response);
			}
		);
	};

	$scope.remove = function(name) {
		$http.delete("/api/files/" + encodeURIComponent(name)).then(
			function success(response) {
				$scope.setAlert("Deleted document '" + name + "'");
			},
			function failure(response) {
				$scope.reset();
				$scope.setAlert("Failed to delete document, reason: " + response);
			}
		);
	};

	$scope.setDirty = function() {
		$scope.doc.dirty = true;
	};

	$scope.canSave = function() {
		return $scope.doc.dirty && $scope.doc.name != '' && $scope.doc.content != '';
	}

	$scope.shouldSave = function() {
		return $scope.doc.dirty;
	}

	$scope.setFocus = function(id) {
		$scope.getById(id).focus();
	};

	$scope.setAlert = function(msg) {
		$scope.alertMessage = msg;
	};

	$scope.clearAlert = function() {
		$scope.alertMessage = undefined;
		$scope.setFocus("content");
	};

	$scope.hasAlert = function() {
		return $scope.alertMessage != undefined;
	};

	$scope.reset = function(ask) {
		if (ask && $scope.doc.dirty) {
			$scope.confirm({
				name: $scope.doc.name,
				ok: function() {
					$scope.reset(false); // call myself without prompting
				}
			});
		} else {
			$scope.doc = {
				name: undefined,
				content: undefined,
				size: undefined,
				modified: undefined,
				dirty: false
			};
			$scope.setFocus("content");
			$scope.settings.backgroundImage = true;
		}
	};

	$scope.open = function(ask) {
		if (ask && $scope.doc.dirty) {
			$scope.confirm({
				name: $scope.doc.name,
				ok: function() {
					$scope.open(false); // call myself without prompting
				}
			});
		} else {
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
		}
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

	$scope.enterSettings = function() {
		$scope.settings.mode = $scope.modes.settings;
	};

	$scope.exitSettings = function() {
		$scope.settings.mode = $scope.modes.main;
	};

	$scope.isSettingsMode = function() {
		return $scope.settings.mode == $scope.modes.settings;
	};

	$scope.getTextSize = function() {
		return $scope.settings.text.fontSize + 'px';
	};

	$scope.setTextSize = function(delta) {
		if (delta == 0 || delta == undefined) {
			$scope.settings.text.fontSize = $scope.defaults.text.fontSize;
		} else {
			$scope.settings.text.fontSize = Math.min(Math.max(Math.round($scope.settings.text.fontSize + delta), $scope.defaults.text.minSize), $scope.defaults.text.maxSize);
		}
	};

	$scope.toggleBackgroundImage = function() {
		$scope.settings.backgroundImage = !$scope.settings.backgroundImage;
	};

	$scope.hasBackgroundImage = function() {
		return $scope.settings.backgroundImage;
	};

	$scope.confirm = function(opts) {
		opts.title || (opts.title = "Confirm");
		opts.message || (opts.message = "Unsaved modifications in document '" + opts.name + "' will be lost. Are you sure?");
		opts.cancel || (opts.cancel = function() { $scope.setFocus("content"); });
		$scope.prompt(opts);
	};

	$scope.prompt = function(opts) {
		var dlg = $uibModal.open({
			animation: false,
			templateUrl: 'prompt.html',
			controller: 'PromptCtrl',
			resolve: {
				title: function() {
					return opts.title;
				},
				message: function() {
					return opts.message;
				}
			}
		});

		dlg.result.then(opts.ok, opts.cancel);
	};

	$scope.reset();
});

app.controller('OpenDocsCtrl', function ($scope, $uibModalInstance) {
	$scope.select = function(doc) {
		$uibModalInstance.close(doc.name);
	}

	$scope.delete = function(doc) {
		$scope.confirm({
			name: doc.name,
			ok: function() {
				$scope.remove(doc.name);
				doc.removed = true;
			},
			message: "Deleting document '" + doc.name + "'. Are you sure?"
		});
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
