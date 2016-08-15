var app = angular.module('App', [ 'ui.bootstrap' ]);

function getById(id) {
	return document.getElementById(id);
}

app.factory('Settings', function($window) {
	var modes = {
		main: 0,
		settings: 1
	};
	var defaults = {
		text: {
			fontFamily: $window.getComputedStyle(getById("content")).getPropertyValue('font-family'),
			fontSize: parseFloat($window.getComputedStyle(getById("content")).getPropertyValue('font-size')),
			minSize: 10, // px
			maxSize: 50  // px
		},
		backgroundImage: true,
		mode: modes.main
	};

	var fontFamily = defaults.text.fontFamily;
	var fontSize = defaults.text.fontSize;
	var backgroundImage = defaults.backgroundImage;
	var mode = defaults.mode;
	var development = true;

	return {
		isDevelopment: function() {
			return development;
		},

		toggleDevelopment: function() {
			return development = !development;
		},

		enterSettings: function() {
			mode = modes.settings;
		},

		exitSettings: function() {
			mode = modes.main;
		},

		isSettingsMode: function() {
			return mode == modes.settings;
		},

		getTextSize: function() {
			return fontSize + 'px';
		},

		setTextSize: function(delta) {
			if (delta == 0 || delta == undefined) {
				fontSize = defaults.text.fontSize;
			} else {
				fontSize = Math.min(Math.max(Math.round(fontSize + delta), defaults.text.minSize), defaults.text.maxSize);
			}
		},

		setBackgroundImage: function() {
			return backgroundImage = true;
		},

		clearBackgroundImage: function() {
			return backgroundImage = false;
		},

		toggleBackgroundImage: function() {
			return backgroundImage = !backgroundImage;
		},

		hasBackgroundImage: function() {
			return backgroundImage;
		}
	};
});

app.factory('Volume', function($http) {
	return function(volume) {
		this.setData = function(volume) {
			if (volume) {
				angular.extend(this, volume);
			}
			return this;
		};

		this.getPath = function(id) {
			return "/api/volumes/" + (id ? id : this.id) + "/";
		};

		this.load = function(id) {
			var self = this;
			$http.get(self.getPath(id)).then(function success(response) {
				return this.setData(response.data);
			});
		};

		this.getIcon = function() {
			switch (this.id) {
				case 'local': return 'fa-hdd-o';
				case 'dropbox': return 'fa-dropbox';
				case 'google': return 'fa-google';
				case 'amazon': return 'fa-amazon';
			}
			return (this.interface == 'usb') ? 'fa-usb' : ((this.interface == 'network') ? 'fa-server' : 'fa-share-alt');
		};

		this.isLocal = function() {
			return this.id == 'local';
		};

		this.mount = function() {
			return $http.post(this.getPath() + "mount");
		};

		this.unmount = function() {
			return $http.post(this.getPath() + "unmount");
		};

		this.setData(volume);
	};
});

app.factory('Volumes', function($http, Volume) {
	return {
		getPath: function() {
			return "/api/volumes/";
		},

		parseList: function(response) {
			return response.data.map(function(v, i, a) {
				return new Volume(v);
			});			
		},

		getList: function() {
			var self = this;
			return $http.get(this.getPath()).then(function success(response) {
				return self.parseList(response);
			});
		},

		getLocal: function() {
			return $http.get(this.getPath() + "/local").then(function success(response) {
				return new Volume(response.data);
			});
		}
	};
});

app.factory('Document', function($http) {
	return function(doc) {
		this.setData = function(doc) {
			angular.extend(this, doc);
			this.clearDirty();
			return self;
		};

		this.getPath = function(volume, name) {
			return volume.getPath() + "files/" + encodeURIComponent(name ? name : this.name);
		};

		this.reset = function(doc) {
			if (doc == undefined) {
				doc = {
					name: undefined,
					content: undefined,
					size: 0,
					modified: new Date()
				};
			}
			return this.setData(doc);
		};

		this.load = function(volume, name) {
			var self = this;
			return $http.get(this.getPath(volume, name)).then(function success(response) {
				return self.reset({
					name: name,
					content: response.data,
					size: response.headers("Content-Length"),
					modified: new Date(Date.parse(response.headers("Last-Modified")))
				});
			});
		};

		this.save = function(volume) {
			var self = this;
			return $http.put(this.getPath(volume), self.content).then(function success(response) {
				return self.clearDirty();
			});
		};

		this.remove = function(volume) {
			return $http.delete(this.getPath(volume));
		};

		this.isDirty = function() {
			return this.dirty;
		};

		this.clearDirty = function() {
			this.dirty = false;
			return this;
		};

		this.setDirty = function() {
			this.dirty = true;
			return this;
		};

		this.canSave = function() {
			return this.isDirty() && this.name != '' && this.content != '';
		};

		this.shouldSave = function() {
			return this.isDirty();
		};

		this.setData(doc);
	}
});

app.factory('Documents', function($http, Document) {
	return {
		getPath: function(volume) {
			return volume.getPath() + "files/";
		},

		getList: function(volume) {
			var self = this;
			return $http.get(this.getPath(volume)).then(function success(response) {
				return response.data.map(function(v, i, a) {
					return new Document(v);
				});
			});
		}
	};
});

app.controller('SoloWriter', function($scope, $window, $http, $uibModal, Settings, Volumes, Volume, Document, Confirm) {
	$scope.settings = Settings;
	$scope.currentVolume = undefined;
	$scope.currentDocument = new Document();

	Volumes.getLocal().then(function success(local) {
		$scope.currentVolume = local;
	});

	$scope.setFocus = function() {
		getById("content").focus();
	};

	$scope.reload = function() {
		$window.location.reload();
	};

	$scope.quit = function() {
		$http.post("/api/quit");
	};

	$scope.shutdown = function() {
		$http.post("/api/shutdown");
	};

	$scope.setAlert = function(msg) {
		$scope.alertMessage = msg;
	};

	$scope.clearAlert = function() {
		$scope.alertMessage = undefined;
		$scope.setFocus();
	};

	$scope.hasAlert = function() {
		return $scope.alertMessage != undefined;
	};

	$scope.resetDoc = function(ask) {
		if (ask && $scope.currentDocument.isDirty()) {
			Confirm.confirm({
				name: $scope.currentDocument.name
			}).then(function ok() {
				$scope.resetDoc(false); // call myself without prompting
			});
		} else {
			$scope.currentDocument.reset();
			$scope.setFocus();
			Settings.setBackgroundImage();
		}
	};

	$scope.openDoc = function(ask) {
		if (ask && $scope.currentDocument.isDirty()) {
			Confirm.confirm({
				name: $scope.currentDocument.name
			}).then(function ok() {
				$scope.openDoc(false); // call myself without prompting
			});
		} else {
			$uibModal.open({
				animation: false,
				templateUrl: 'docs.html',
				controller: 'DocumentsCtrl',
				resolve: {
					currentVolume: function() {
						return $scope.currentVolume;
					}
				}
			}).result.then(function success(selected) {
				$scope.currentDocument.load(selected.volume, selected.doc.name);
			}).finally(function() {
				$scope.setFocus();
			});
		}
	};

	$scope.saveDoc = function() {
		$scope.currentDocument.save($scope.currentVolume);
		$scope.setFocus();
	};

	$scope.selectStorage = function() {
		$uibModal.open({
			animation: false,
			templateUrl: '/storage.html',
			controller: 'StorageCtrl',
			resolve: {
				currentVolume: function() {
					return $scope.currentVolume;
				}
			}
		}).result.then(function success(selected) {
			$scope.currentVolume = selected.volume;
		}).finally(function() {
			$scope.setFocus();
		});
	};

	$scope.clearAlert();
});

app.controller('DocumentsCtrl', function ($scope, $uibModal, $uibModalInstance, Documents, currentVolume, Confirm) {
	$scope.currentVolume = currentVolume;
	$scope.documents = undefined;
	$scope.selected = undefined;
	$scope.loading = false;

	$scope.refreshDocuments = function() {
		$scope.loading = true;
		Documents.getList($scope.currentVolume).then(function success(list) {
			$scope.documents = list;
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.selectStorage = function() {
		$uibModal.open({
			animation: false,
			templateUrl: '/storage.html',
			controller: 'StorageCtrl',
			resolve: {
				currentVolume: function() {
					return $scope.currentVolume;
				}
			}
		}).result.then(function (selected) {
			$scope.currentVolume = selected.volume;
			$scope.refreshDocuments();
		});
	};

	$scope.selectDoc = function(doc) {
		$uibModalInstance.close({ doc: doc, volume: $scope.currentVolume });
	}

	$scope.deleteDoc = function(doc) {
		Confirm.confirm({
			name: doc.name,
			message: "Deleting document '" + doc.name + "'. Are you sure?"
		}).then(function ok() {
			doc.remove($scope.currentVolume);
			doc.removed = true;
		});
	}

	$scope.refreshDocuments();
});

app.controller('StorageCtrl', function ($scope, $uibModalInstance, Volumes, currentVolume) {
	$scope.volumes = undefined;
	$scope.selected = currentVolume;
	$scope.loading = false;

	$scope.refreshVolumes = function() {
		$scope.loading = true;
		Volumes.getList().then(function success(list) {
			$scope.volumes = list;
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.isVolumeSelected = function(volume) {
		return $scope.selected.id == volume.id;
	};

	$scope.selectVolume = function(volume) {
		$scope.selected = volume;
		$uibModalInstance.close({ volume: volume });
	};

	$scope.mountVolume = function(volume) {
		$scope.loading = volume.id;
		volume.mount().then(function success(response) {
			$scope.volumes = Volumes.parseList(response);
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.unmountVolume = function(volume) {
		$scope.loading = volume.id;
		volume.unmount().then(function success(response) {
			$scope.volumes = Volumes.parseList(response);
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.refreshVolumes();
});

app.service('Confirm', function($uibModal) {
	this.confirm = function(opts) {
		opts.title || (opts.title = "Confirm");
		opts.message || (opts.message = "Unsaved modifications in document '" + opts.name + "' will be lost. Are you sure?");
		return this.prompt(opts);
	};

	this.prompt = function(opts) {
		return $uibModal.open({
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
		}).result;
	};
});

app.controller('PromptCtrl', function ($scope, $uibModalInstance, title, message) {
	$scope.title = title;
	$scope.message = message;
});

app.filter('bytes', function() {
	return function(bytes, precision) {
		if (bytes == 0 || isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});
