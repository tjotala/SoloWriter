var app = angular.module('App', [ 'ui.bootstrap' ]);

function getById(id) {
	return document.getElementById(id);
}

function setFocus(id) {
	getById(id).focus();
}

function cloneObject(obj) {
	return JSON.parse(JSON.stringify(obj)); // hokey JS way to dupe an object
}

app.controller('DocumentStore', function DocumentStore($scope, $http, $uibModal) {
	var contentStyle = window.getComputedStyle(getById("content"));
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
	$scope.settings = cloneObject($scope.defaults);
	$scope.development = true;
	$scope.storage = undefined;

	$scope.isDevelopment = function() {
		return $scope.development;
	};

	$scope.toggleDevelopment = function() {
		return $scope.development = !$scope.development;
	};

	$scope.getList = function(url, callback) {
		$http.get(url).then(
			function success(response) {
				callback(response.data);
			},
			function failure(response) {
				callback([ ]);
			}
		);
	};

	$scope.docPath = function(name, volume) {
		return "/api/volumes/" + (volume ? volume.id : $scope.storage.id) + "/files/" + encodeURIComponent(name);
	};

	$scope.listDocs = function(callback) {
		$scope.getList($scope.docPath(""), callback);
	};

	$scope.listVolumes = function(callback) {
		$scope.getList("/api/volumes", callback);
	};

	$scope.listNetworks = function(callback) {
		$scope.getList("/api/networks", callback);
	};

	$scope.getLocalVolume = function(callback) {
		$http.get("/api/volumes/local").then(
			function success(response) {
				callback(response.data);
			},
			function failure(response) {
			}
		);
	};

	$scope.mountVolume = function(volume, callback) {
		$http.post("/api/volumes/" + volume.id + "/mount").then(
			function success(response) {
				callback(response.data);
			},
			function failure(response) {
			}
		);
	};

	$scope.unmountVolume = function(volume, callback) {
		$http.post("/api/volumes/" + volume.id + "/unmount").then(
			function success(response) {
				callback(response.data);
			},
			function failure(response) {
			}
		);
	};

	$scope.loadDoc = function(name) {
		$http.get($scope.docPath(name)).then(
			function success(response) {
				$scope.doc = {
					name: name,
					content: response.data,
					size: response.headers("Content-Length"),
					modified: new Date(Date.parse(response.headers("Last-Modified"))),
					dirty: false
				};
				setFocus("content");
				$scope.settings.backgroundImage = false;
			},
			function failure(response) {
				$scope.resetDoc();
				$scope.setAlert("Failed to load document, reason: " + response);
			}
		);
	};

	$scope.saveDoc = function(name, content) {
		$http.put($scope.docPath(name), content).then(
			function success(response) {
				$scope.doc.dirty = false;
			},
			function failure(response) {
				$scope.setAlert("Failed to save document, reason: " + response);
			}
		);
	};

	$scope.deleteDoc = function(name) {
		$http.delete($scope.docPath(name)).then(
			function success(response) {
				$scope.setAlert("Deleted document '" + name + "'");
			},
			function failure(response) {
				$scope.resetDoc();
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

	$scope.setAlert = function(msg) {
		$scope.alertMessage = msg;
	};

	$scope.clearAlert = function() {
		$scope.alertMessage = undefined;
		setFocus("content");
	};

	$scope.hasAlert = function() {
		return $scope.alertMessage != undefined;
	};

	$scope.resetDoc = function(ask) {
		if (ask && $scope.doc.dirty) {
			$scope.confirm({
				name: $scope.doc.name,
				ok: function() {
					$scope.resetDoc(false); // call myself without prompting
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
			setFocus("content");
			$scope.settings.backgroundImage = true;
		}
	};

	$scope.openDoc = function(ask) {
		if (ask && $scope.doc.dirty) {
			$scope.confirm({
				name: $scope.doc.name,
				ok: function() {
					$scope.openDoc(false); // call myself without prompting
				}
			});
		} else {
			$scope.listDocs(function(documents) {
				$scope.documents = documents;
			});

			var dlg = $uibModal.open({
				animation: false,
				templateUrl: 'docs.html',
				controller: 'DocumentsCtrl',
				scope: $scope,
				size: 'lg'
			});

			dlg.result.then(function (selected) {
				$scope.loadDoc(selected);
			});
		}
	};

	$scope.reload = function() {
		window.location.reload();
	};

	$scope.quit = function() {
		$http.post("/api/quit");
	};

	$scope.shutdown = function() {
		$http.post("/api/shutdown");
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
		return $scope.settings.backgroundImage = !$scope.settings.backgroundImage;
	};

	$scope.hasBackgroundImage = function() {
		return $scope.settings.backgroundImage;
	};

	$scope.getStorageIcon = function(volume) {
		switch (volume.id) {
			case 'local': return 'fa-hdd-o';
			case 'dropbox': return 'fa-dropbox';
			case 'google': return 'fa-google';
			case 'amazon': return 'fa-amazon';
		}
		return (volume.interface == 'usb') ? 'fa-usb' : ((volume.interface == 'network') ? 'fa-server' : 'fa-share-alt');
	};

	$scope.getSelectedStorage = function() {
		return $scope.storage;
	};

	$scope.isStorageSelected = function(volume) {
		return $scope.storage.id == volume.id;
	};

	$scope.refreshVolumes = function() {
		$scope.listVolumes(function(volumes) {
			$scope.volumes = volumes;
		});
	};

	$scope.selectStorage = function() {
		$scope.refreshVolumes();

		var dlg = $uibModal.open({
			animation: false,
			templateUrl: 'storage.html',
			controller: 'StorageCtrl',
			scope: $scope
		});

		dlg.result.then(function (selected) {
			$scope.storage = selected;
		});
	};

	$scope.confirm = function(opts) {
		opts.title || (opts.title = "Confirm");
		opts.message || (opts.message = "Unsaved modifications in document '" + opts.name + "' will be lost. Are you sure?");
		opts.cancel || (opts.cancel = function() { setFocus("content"); });
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

	$scope.getLocalVolume(function(volume) {
		$scope.storage = volume;
	});
	$scope.resetDoc();
});

app.controller('DocumentsCtrl', function ($scope, $uibModalInstance) {
	$scope.selectDoc = function(doc) {
		$uibModalInstance.close(doc.name);
	};

	$scope.deleteDoc = function(doc) {
		$scope.confirm({
			name: doc.name,
			ok: function() {
				$scope.deleteDoc(doc.name);
				doc.removed = true;
			},
			message: "Deleting document '" + doc.name + "'. Are you sure?"
		});
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

app.controller('StorageCtrl', function ($scope, $uibModalInstance) {
	$scope.selected = $scope.getSelectedStorage();

	$scope.isVolumeSelected = function(volume) {
		return $scope.selected.id == volume.id;
	};

	$scope.selectVolume = function(volume) {
		$scope.selected = volume;
	};

	$scope.mountVolume = function(volume) {
		$scope.$parent.mountVolume(volume, function() {
			$scope.refreshVolumes();
		});
	};

	$scope.unmountVolume = function(volume) {
		$scope.$parent.unmountVolume(volume, function() {
			$scope.refreshVolumes();
		});
	};

	$scope.ok = function() {
		$uibModalInstance.close($scope.selected);
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

app.controller('PromptCtrl', function ($scope, $uibModalInstance, title, message) {
	$scope.title = title;
	$scope.message = message;

	$scope.ok = function() {
		$uibModalInstance.close('ok');
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};
});

app.filter('bytes', function() {
	return function(bytes, precision) {
		if (bytes == 0 || isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});
