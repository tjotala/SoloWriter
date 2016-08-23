var app = angular.module("App", [ "ui.bootstrap" ]);

function getById(id) {
	return document.getElementById(id);
}

function setFocus(id) {
	getById(id).focus();
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

		this.login = function(password) {
			var self = this;
			return $http.post("/api/login", { username: self.username, password: password });
		};

		this.logout = function() {
			return $http.post("/api/logout");
		};

		this.whoami = function() {
			var self = this;
			return $http.get("/api/whoami").then(function success(response) {
				self.reset(response.data);
			}, function failure() {
				self.reset(undefined);
			});
		};

		this.changeUsername = function(old_password, new_username) {
			return $http.post(this.getPath(), { password: old_password, new_username: new_username });
		};

		this.changePassword = function(old_password, new_password) {
			return $http.post(this.getPath(), { password: old_password, new_password: new_password });
		};

		this.setData(user);
	}
});

app.factory("Users", function($http, User) {
	return {
		getPath: function() {
			return "/api/users/";
		},

		parseList: function(response) {
			return response.data.map(function(u, i, a) {
				return new User(u);
			});			
		},

		getList: function() {
			var self = this;
			return $http.get(this.getPath()).then(function success(response) {
				return self.parseList(response);
			});
		},

		create: function(username, password) {
			var self = this;
			return $http.put(this.getPath() + encodeURIComponent(username), { password: password }).then(function success(response) {
				return self.parseList(response);
			});
		},

		remove: function(username, password) {
			var self = this;
			return $http.delete(this.getPath() + encodeURIComponent(username), { data: { password: password }, headers: { "Content-Type": "application/json" } }).then(function success(response) {
				return self.parseList(response);
			});
		}
	};
});

app.controller("SoloWriter", function($scope, $window, $log, $http, $interval, $uibModal, Settings, User, Volumes, Volume, Document, MessageBox, CONTENT_ID, AUTOSAVE_FREQUENCY_NEVER) {
	$scope.settings = Settings;
	$scope.currentVolume = undefined;
	$scope.currentDocument = new Document();
	$scope.currentUser = undefined;
	var autoSaver = undefined;

	Volumes.getLocal().then(function success(local) {
		$scope.currentVolume = local;
	});

	$scope.setFocus = function() {
		setFocus(CONTENT_ID);
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
			$log.debug("logging in as '" + selected.username + "'");
			$scope.currentUser = new User(selected);
			$scope.currentUser.login().then(function success() {
				$log.info("logged in as '" + selected.username + "'");
			}, function failure() {
				$scope.currentUser = undefined;
				Confirm.error({
					message: "Failed to login as '" + selected.username + "'"
				});
			});
		}).finally(function () {
			$scope.setFocus();
		});
	};

	$scope.logout = function() {
		$scope.currentUser.logout();
		$scope.currentUser = undefined;
	};

	$scope.selectUser = function() {
		$uibModal.open({
			animation: false,
			templateUrl: "users.html",
			controller: "UsersCtrl",
			resolve: {
				currentUser: function() {
					return $scope.currentUser;
				}
			}
		}).result.then(function success(response) {
			if (angular.isDefined(response.user)) {
				$scope.currentUser = response.user;
			}
		}).finally(function () {
			$scope.setFocus();
		});
	};

	$scope.resetDoc = function(ask) {
		if (ask && $scope.currentDocument.isDirty()) {
			MessageBox.confirm({
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
			MessageBox.confirm({
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
					},
					currentUser: function() {
						return $scope.currentUser;
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

	$scope.startAutoSave();
});

app.controller("DocumentsCtrl", function ($scope, $uibModal, $uibModalInstance, Documents, currentVolume, currentUser, MessageBox) {
	$scope.currentVolume = currentVolume;
	$scope.currentUser = currentUser;
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
		MessageBox.confirm({
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

app.controller("LoginCtrl", function ($scope, $log, $uibModalInstance, Users, user) {
	$scope.users = undefined;
	$scope.user = undefined;
	$scope.password = "";

	$scope.refreshUsers = function() {
		$scope.loading = true;
		Users.getList().then(function success(list) {
			$scope.users = list;
			$scope.user = $scope.users[0];
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.ok = function() {
		$uibModalInstance.close({ username: $scope.user.username, password: $scope.password });
	};

	$scope.refreshUsers();
});

app.controller("UsersCtrl", function ($scope, $log, $uibModalInstance, Users, User, Password, MessageBox, currentUser) {
	$scope.users = undefined;
	$scope.currentUser = currentUser;
	$scope.username = "";
	$scope.password = "";

	$scope.refreshUsers = function() {
		$scope.loading = true;
		Users.getList().then(function success(list) {
			$scope.users = list;
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.loginUser = function(user) {
		Password.challenge({
			for: user.username
		}).then(function success(response) {
			$scope.loading = true;
			user.login(response.password).then(function success() {
				$uibModalInstance.close({ user: user });
			}, function failure() {
				MessageBox.error({
					message: "Failed to login as " + user.username
				});
			}).finally(function() {
				$scope.loading = false;
			});
		});
	};

	$scope.addUser = function() {
		$scope.loading = true;
		Users.create($scope.username.trim(), $scope.password).then(function success(list) {
			$scope.users = list;
			$scope.username = undefined;
			$scope.password = undefined;
		}, function failure(response) {
			MessageBox.error({
				message: "Failed to create new user " + $scope.username + ", " + response.data.error
			});
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.deleteUser = function(user) {
		Password.challenge({
			for: user.username
		}).then(function success(password) {
			$scope.loading = true;
			Users.remove(user.username, password.password).then(function success(list) {
				$scope.users = list;
			}, function failure() {
				MessageBox.error({
					message: "Failed to delete " + user.username
				});
			}).finally(function() {
				$scope.loading = false;
			});
		});
	};

	$scope.changeUsername = function(user) {
		Password.challenge({
			title: "Enter New Username for " + user.username,
			label: "New Username",
			field: "new_username",
			value: user.username
		}).then(function success(response) {
			$scope.loading = true;
			user.changeUsername(response.password, response.new_username).then(function success() {
				$scope.refreshUsers();
			}, function failure() {
				MessageBox.error({
					message: "Failed to change username of " + user.username
				});
			}).finally(function() {
				$scope.loading = false;
			});
		});
	};

	$scope.changePassword = function(user) {
		Password.challenge({
			title: "Enter New Password for " + user.username,
			label: "New Password",
			field: "new_password",
			value: undefined,
			is_password: true
		}).then(function success(response) {
			$scope.loading = true;
			user.changePassword(response.password, response.new_password).then(function success() {
				$scope.refreshUsers();
			}, function failure() {
				MessageBox.error({
					message: "Failed to change password of " + user.username
				});
			}).finally(function() {
				$scope.loading = false;
			});
		});
	};

	$scope.refreshUsers();
});

app.service("Password", function($uibModal) {
	this.challenge = function(extra) {
		if (!angular.isDefined(extra)) {
			extra = { };
		}
		return $uibModal.open({
			animation: false,
			templateUrl: "password.html",
			controller: "PasswordCtrl",
			resolve: {
				extra: function() {
					return extra;
				}
			}
		}).result;
	};
});

app.controller("PasswordCtrl", function ($scope, $uibModalInstance, extra) {
	$scope.extra = angular.copy(extra);
	$scope.password = undefined;
	if (angular.isDefined(extra.title)) {
		$scope.title = extra.title;
	} else if (angular.isDefined(extra.for)) {
		$scope.title = "Enter Password for " + extra.for;
	} else {
		$scope.title = "Enter Password";
	}

	$scope.ok = function() {
		var result = { password: $scope.password };
		if (angular.isDefined($scope.extra)) {
			result[$scope.extra.field] = $scope.extra.value;
		}
		$uibModalInstance.close(result);
	};
});

app.service("MessageBox", function($uibModal) {
	this.confirm = function(options) {
		options.title || (options.title = "Confirm");
		options.message || (options.message = "Unsaved modifications in document '" + options.name + "' will be lost. Are you sure?");
		return this.prompt(options);
	};

	this.error = function(options) {
		options.title || (options.title = "Error");
		options.ok_only = true;
		return this.prompt(options);
	};

	this.prompt = function(options) {
		return $uibModal.open({
			animation: false,
			templateUrl: "messagebox.html",
			controller: "MessageBoxCtrl",
			resolve: {
				options: function() {
					return options;
				}
			}
		}).result;
	};
});

app.controller("MessageBoxCtrl", function ($scope, $uibModalInstance, options) {
	$scope.options = angular.copy(options);
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
