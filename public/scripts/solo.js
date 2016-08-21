var app = angular.module("App", [ "ui.bootstrap" ]);

function getById(id) {
	return document.getElementById(id);
}

function now8601() {
	return (new Date()).toISOString();
}

app.constant("CONTENT_ID", "content");
app.constant("LOCAL_VOLUME_ID", "local");
app.constant("DEFAULT_DOCUMENT_NAME", "NoName");
app.constant("AUTOSAVE_FREQUENCY_NEVER", 0);

app.config(function($logProvider){
  $logProvider.debugEnabled(false);
});

app.factory("Settings", function($window, $interpolate, CONTENT_ID, DEFAULT_DOCUMENT_NAME) {
	var defFontSize = parseFloat($window.getComputedStyle(getById(CONTENT_ID)).getPropertyValue("font-size"));
	var minFontSize = 10; // px
	var maxFontSize = 50; // px
	var fontSize = defFontSize;
	var fontFamily = $window.getComputedStyle(getById(CONTENT_ID)).getPropertyValue("font-family");
	var backgroundImage = true;
	var autoSave = {
		frequency: 1, // minutes
		tempName: {
			use: true,
			pattern: "{{name}}.autosave" // this is run through $interpolate(pattern)({ name: <filename> })
		}
	}
	var mainMode = true; // true = main, false = settings
	var devMode = true;  // true = development mode, false = not development mode

	return {
		isDevelopment: function() {
			return devMode;
		},

		toggleDevelopment: function() {
			devMode = !devMode;
		},

		enterSettings: function() {
			mainMode = false;
		},

		exitSettings: function() {
			mainMode = true;
		},

		isSettingsMode: function() {
			return !mainMode;
		},

		getTextSize: function() {
			return fontSize + "px";
		},

		setTextSize: function(delta) {
			if (delta == 0 || angular.isDefined(delta)) {
				fontSize = defFontSize;
			} else {
				fontSize = Math.min(Math.max(Math.round(fontSize + delta), minFontSize), maxFontSize);
			}
		},

		setBackgroundImage: function() {
			backgroundImage = true;
		},

		clearBackgroundImage: function() {
			backgroundImage = false;
		},

		toggleBackgroundImage: function() {
			backgroundImage = !backgroundImage;
		},

		hasBackgroundImage: function() {
			return backgroundImage;
		},

		getAutoSaveFrequency: function() {
			return autoSave.frequency;
		},

		getAutoSaveFrequencyAsMs: function() {
			return autoSave.frequency * 60 * 1000;
		},

		setAutoSaveFrequency: function(freq) {
			autoSave.frequency = freq;
		},

		getAutoSaveTempName: function(name) {
			return {
				use: autoSave.tempName.use,
				pattern: autoSave.tempName.pattern,
				name: $interpolate(autoSave.tempName.pattern)({ name: angular.isDefined(name) ? name : DEFAULT_DOCUMENT_NAME})
			};
		},

		setAutoSaveTempName: function(useTemp, pattern) {
			autoSave.tempName.use = useTemp;
			if (angular.isDefined(pattern)) {
				autoSave.tempName.pattern = pattern;
			}
		}
	};
});

app.factory("Volume", function($http, LOCAL_VOLUME_ID) {
	return function(volume) {
		this.setData = function(volume) {
			if (angular.isDefined(volume)) {
				angular.extend(this, volume);
			}
			return this;
		};

		this.getPath = function(newId) {
			return "/api/volumes/" + (angular.isDefined(newId) ? newId : this.id) + "/";
		};

		this.load = function(newId) {
			var self = this;
			$http.get(self.getPath(newId)).then(function success(response) {
				return this.setData(response.data);
			});
		};

		this.getIcon = function() {
			switch (this.id) {
				case LOCAL_VOLUME_ID: return "fa-hdd-o";
				case "dropbox": return "fa-dropbox";
				case "google": return "fa-google";
				case "amazon": return "fa-amazon";
			}
			return (this.interface == "usb") ? "fa-usb" : ((this.interface == "network") ? "fa-server" : "fa-share-alt");
		};

		this.isLocal = function() {
			return this.id == LOCAL_VOLUME_ID;
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

app.factory("Volumes", function($http, Volume, LOCAL_VOLUME_ID) {
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
			return $http.get(this.getPath() + LOCAL_VOLUME_ID).then(function success(response) {
				return new Volume(response.data);
			});
		}
	};
});

app.factory("Document", function($http, DEFAULT_DOCUMENT_NAME) {
	return function(doc) {
		this.setData = function(doc) {
			angular.extend(this, doc);
			this.clearDirty();
			return this;
		};

		this.getPath = function(volume, newName) {
			return volume.getPath() + "files/" + encodeURIComponent(angular.isDefined(newName) ? newName : this.name);
		};

		this.getName = function() {
			return angular.isDefined(this.name) ? this.name : DEFAULT_DOCUMENT_NAME;
		};

		this.reset = function(doc) {
			if (!angular.isDefined(doc)) {
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

		this.save = function(volume, nameOverride, autoSave) {
			var self = this;
			return $http.put(this.getPath(volume, nameOverride), self.content).then(function success(response) {
				if (angular.isDefined(autoSave) && autoSave) {
					return self;
				} else {
					return self.clearDirty();
				}
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
			return this.isDirty() && this.name != "" && this.content != "";
		};

		this.shouldSave = function() {
			return this.isDirty();
		};

		this.setData(doc);
	}
});

app.factory("Documents", function($http, Document) {
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

app.factory("User", function($http) {
	return function(user) {
		this.setData = function(user) {
			angular.extend(this, user);
			return this;
		};

		this.getPath = function(username) {
			return "/api/users/" + encodeURIComponent(angular.isDefined(username) ? username : this.username);
		};

		this.getName = function() {
			return this.username;
		};

		this.reset = function(user) {
			if (!angular.isDefined(user)) {
				user = {
					username: undefined
				}
			}
			this.setData(user);
		};

		this.load = function(username) {
			var self = this;
			return $http.get(this.getPath(username)).then(function success(response) {
				return self.reset({
					username: username
				});
			});
		};

		this.remove = function(volume) {
			return $http.delete(this.getPath());
		};

		this.login = function() {
			var self = this;
			return $http.post("/api/login", { username: self.username, password: self.password });
		};

		this.logout = function() {
			return $http.post("/api/logout");
		};

		this.setData(user);
	}
});

app.controller("SoloWriter", function($scope, $window, $log, $http, $interval, $uibModal, Settings, User, Volumes, Volume, Document, Confirm, CONTENT_ID, AUTOSAVE_FREQUENCY_NEVER) {
	$scope.settings = Settings;
	$scope.currentVolume = undefined;
	$scope.currentDocument = new Document();
	$scope.currentUser = undefined;
	var autoSaver = undefined;

	Volumes.getLocal().then(function success(local) {
		$scope.currentVolume = local;
	});

	$scope.setFocus = function() {
		getById(CONTENT_ID).focus();
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
		return angular.isDefined($scope.alertMessage);
	};

	$scope.isLoggedIn = function() {
		return angular.isDefined($scope.currentUser);
	};

	$scope.login = function() {
		$uibModal.open({
			animation: false,
			templateUrl: "login.html",
			controller: "LoginCtrl",
			resolve: {
				user: function() {
					return angular.copy($scope.currentUser);
				}
			}
		}).result.then(function success(selected) {
			$log.info("logging in as " + selected.username);
			$scope.currentUser = new User(selected);
			$scope.currentUser.login();
		}).finally(function () {
			$scope.setFocus();
		});
	};

	$scope.logout = function() {
		$scope.currentUser.logout();
		$scope.currentUser = undefined;
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
				templateUrl: "docs.html",
				controller: "DocumentsCtrl",
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

	$scope.saveDoc = function(name, autoSave) {
		$scope.currentDocument.save($scope.currentVolume, name, autoSave);
		$scope.setFocus();
	};

	$scope.selectStorage = function() {
		$uibModal.open({
			animation: false,
			templateUrl: "storage.html",
			controller: "StorageCtrl",
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

	$scope.selectAutoSave = function() {
		$uibModal.open({
			animation: false,
			templateUrl: "autosave.html",
			controller: "AutoSaveCtrl",
			resolve: {
				autoSave: function() {
					return {
						frequency: $scope.settings.getAutoSaveFrequency(),
						tempName: angular.copy($scope.settings.getAutoSaveTempName())
					};
				}
			}
		}).result.then(function success(selected) {
			$scope.settings.setAutoSaveFrequency(selected.frequency);
			$scope.settings.setAutoSaveTempName(selected.tempName);
		}).finally(function() {
			$scope.setFocus();
		});
	};

	$scope.startAutoSave = function() {
		$scope.stopAutoSave();
		if ($scope.settings.getAutoSaveFrequency() != AUTOSAVE_FREQUENCY_NEVER) {
			$log.debug(now8601() + " -- starting autosaver");
			autoSaver = $interval(function() {
				if ($scope.currentDocument.shouldSave()) {
					$log.debug(now8601() + " -- autosaving");
					$scope.currentDocument.save($scope.currentVolume, $scope.settings.getAutoSaveTempName($scope.currentDocument.getName()).name, true);
				} else {
					$log.debug(now8601() + " -- skipped autosave, nothing to save");
				}
			}, $scope.settings.getAutoSaveFrequencyAsMs());
		}
	};

	$scope.stopAutoSave = function() {
		if (angular.isDefined(autoSaver)) {
			$log.debug(now8601() + " -- stopping autosaver");
			$interval.cancel(autoSaver);
			autoSaver = undefined;
		}
	}

	$scope.clearAlert();
	$scope.startAutoSave();
});

app.controller("DocumentsCtrl", function ($scope, $uibModal, $uibModalInstance, Documents, currentVolume, Confirm) {
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
			templateUrl: "storage.html",
			controller: "StorageCtrl",
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
	};

	$scope.deleteDoc = function(doc) {
		Confirm.confirm({
			name: doc.name,
			message: "Deleting document '" + doc.name + "'. Are you sure?"
		}).then(function ok() {
			doc.remove($scope.currentVolume);
			doc.removed = true;
		});
	};

	$scope.refreshDocuments();
});

app.controller("StorageCtrl", function ($scope, $uibModalInstance, Volumes, currentVolume) {
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

app.controller("AutoSaveCtrl", function ($scope, $uibModalInstance, autoSave, AUTOSAVE_FREQUENCY_NEVER) {
	$scope.never = AUTOSAVE_FREQUENCY_NEVER;
	$scope.frequency = autoSave.frequency;
	$scope.tempName = angular.copy(autoSave.tempName);

	$scope.ok = function() {
		$uibModalInstance.close({ frequency: $scope.frequency, tempName: angular.copy($scope.tempName) });
	};
});

app.controller("LoginCtrl", function ($scope, $log, $uibModalInstance, user) {
	$scope.username = angular.isDefined(user) ? user.username : undefined;
	$scope.password = "";

	$scope.ok = function() {
		$uibModalInstance.close({ username: $scope.username, password: $scope.password });
	};
});

app.service("Confirm", function($uibModal) {
	this.confirm = function(opts) {
		opts.title || (opts.title = "Confirm");
		opts.message || (opts.message = "Unsaved modifications in document '" + opts.name + "' will be lost. Are you sure?");
		return this.prompt(opts);
	};

	this.prompt = function(opts) {
		return $uibModal.open({
			animation: false,
			templateUrl: "prompt.html",
			controller: "PromptCtrl",
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

app.controller("PromptCtrl", function ($scope, $uibModalInstance, title, message) {
	$scope.title = title;
	$scope.message = message;
});

app.filter("bytes", function() {
	return function(bytes, precision) {
		if (bytes == 0 || isNaN(parseFloat(bytes)) || !isFinite(bytes)) return "-";
		if (!angular.isDefined(precision)) precision = 1;
		var units = [ "B", "KB", "MB", "GB", "TB", "PB" ];
		var number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + " " + units[number];
	}
});

app.directive('ngEnter', function () {
	return function (scope, element, attrs) {
		element.bind("keydown keypress", function (event) {
			if(event.which === 13) {
				scope.$apply(function (){
					scope.$eval(attrs.ngEnter);
				});
 
				event.preventDefault();
			}
		});
	};
});
