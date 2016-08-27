"use strict";

var app = angular.module("App", [ "ui.bootstrap", "ngTouch", "ngAnimate", "ngIdle" ]);

function getById(id) {
	return document.getElementById(id);
}

function setFocus(id) {
	getById(id).focus();
}

function setSelectionRange(input, selStart, selEnd) {
	if (input.setSelectionRange) {
		input.focus();
		input.setSelectionRange(selStart, selEnd);
	} else if (input.createTextRange) {
		var range = input.createTextRange();
		range.collapse(true);
		range.moveEnd("character", selEnd);
		range.moveStart("character", selStart);
		range.select();
	}
}

function setCaretToPos(id, pos) {
	setSelectionRange(getById(id), pos, pos);
}

function scrollTop(id, pos) {
	getById(id).scrollTop = pos;
}

function now8601() {
	return (new Date()).toISOString();
}

app.constant("CONTENT_ID", "content");
app.constant("LOCAL_VOLUME_ID", "local");
app.constant("DEFAULT_DOCUMENT_NAME", "NoName");

app.config(function($logProvider, IdleProvider, KeepaliveProvider){
	$logProvider.debugEnabled(false);

	IdleProvider.idle(10); // in seconds
	IdleProvider.timeout(20); // in seconds
	IdleProvider.autoResume(true);
	IdleProvider.keepalive(true);
});

app.run(function(Idle){
	Idle.watch();
});

function RangeOption(values) {
	this.setData = function(other) {
		angular.extend(this, other);
		this.default = this.default || this.min;
		this.current = this.current || this.default;
		this.units = this.units || "msec";
		return this;
	};

	this.scaleTo = function(mul, div, units) {
		var old_units = this.units;
		var copy = angular.copy(this);
		copy.units = units;
		for(var key in copy) {
			if (copy.hasOwnProperty(key) && angular.isNumber(copy[key])) {
				copy[key] = copy[key] * mul / div;
			}
		}
		copy.restore = function() { return copy.scaleTo(div, mul, old_units); };
		return copy;
	};

	// for unscaled values, this is no-op
	this.restore = function() { return angular.copy(this); }

	// these assume the source is msec
	this.asMs = function() {
		return angular.copy(this);
	};
	this.asSec = function() {
		return this.scaleTo(1, 1000, "sec");
	};
	this.asMin = function() {
		return this.scaleTo(1, 60 * 1000, "min");
	};

	this.setData(values);
	return this;
}

app.factory("Settings", function($window, $interpolate, $uibModal, CONTENT_ID, DEFAULT_DOCUMENT_NAME) {

	var textSize = new RangeOption({
		enabled: true,
		min: 10, // px
		max: 50, // px
		step: 10, // px
		units: "px",
		default: parseFloat($window.getComputedStyle(getById(CONTENT_ID)).getPropertyValue("font-size")),
		asStyle: function() { return { 'font-size': this.current + this.units, 'font-family': this.font }; },
		font: $window.getComputedStyle(getById(CONTENT_ID)).getPropertyValue("font-family"),
		setFrom: function(other) { this.enabled = other.enabled; this.current = other.current; }
	});

	var autoSaveTime = new RangeOption({
		enabled: true,
		min: 0.5 * 60 * 1000, // ms
		max: 5 * 60 * 1000, // ms
		step: 0.5 * 60 * 1000, // ms
		default: 1 * 60 * 1000, // ms
		setFrom: function(other) {this.enabled = other.enabled; this.current = other.current; }
	});
	var autoSaveName = {
		enabled: true,
		pattern: "{{name}}.autosave", // this is run through $interpolate(pattern)({ name: <filename> })
		name: function(fill) { return $interpolate(this.pattern)({ name: angular.isDefined(fill) ? fill : DEFAULT_DOCUMENT_NAME}); },
		setFrom: function(other) { this.enabled = other.enabled; }
	};

	var lockScreenTime = new RangeOption({
		enabled: true,
		min: 1 * 60 * 1000, // ms
		max: 10 * 60 * 1000, // ms
		step: 1 * 60 * 1000, // ms
		default: 1 * 60 * 1000, // ms
		setFrom: function(other) { this.enabled = other.enabled; this.current = other.current; }
	});
	var lockScreenInterval = new RangeOption({
		enabled: true,
		min: 10 * 1000, // ms
		max: 60 * 1000, // ms
		step: 5 * 1000, // ms
		default: 10 * 1000, // ms
		setFrom: function(other) { this.enabled = other.enabled; this.current = other.current; }
	});

	var backgroundImage = true;
	var devMode = true;  // true = development mode, false = not development mode

	return {
		isDevelopment: function() {
			return devMode;
		},
		toggleDevelopment: function() {
			devMode = !devMode;
		},

		setBackgroundImage: function(val) {
			backgroundImage = val;
		},
		getBackgroundImage: function() {
			return backgroundImage;
		},

		getTextSize: function() {
			return textSize;
		},
		setTextSize: function(other) {
			textSize.setFrom(other);
		},

		getAutoSaveTime: function() {
			return autoSaveTime;
		},
		setAutoSaveTime: function(other) {
			autoSaveTime.setFrom(other);
		},

		getAutoSaveName: function() {
			return autoSaveName;
		},
		setAutoSaveName: function(other) {
			autoSaveName.setFrom(other);
		},

		getLockScreenTime: function() {
			return lockScreenTime;
		},
		setLockScreenTime: function(other) {
			lockScreenTime.setFrom(other);
		},

		getLockScreenInterval: function() {
			return lockScreenInterval;
		},
		setLockScreenInterval: function(other) {
			lockScreenInterval.setFrom(other);
		},

		select: function() {
			var self = this;
			return $uibModal.open({
				animation: false,
				templateUrl: "settings.html",
				controller: "SettingsCtrl",
				size: "lg"
			}).result.then(function success(settings) {
				self.setTextSize(settings.textSize);
				self.setAutoSaveTime(settings.autoSaveTime);
				self.setAutoSaveName(settings.autoSaveName);
				self.setLockScreenTime(settings.lockScreenTime);
				self.setLockScreenInterval(settings.lockScreenInterval);
				self.setBackgroundImage(settings.backgroundImage);
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

		this.load = function(id) {
			var self = this;
			return $http.get("/api/users/" + id).then(function success(response) {
				return self.setData(response.data);
			});
		};

		this.remove = function(password) {
			var body = { password: password };
			var hdrs = { "Content-Type": "application/json" };
			return $http.delete("/api/users/" + this.id, { data: body, headers: hdrs });
		};

		this.changeUsername = function(old_password, new_username) {
			var body = { password: old_password, new_username: new_username };
			return $http.post("/api/users/" + this.id, body).then(function success(response) {
				self.setData(response.data);
			});
		};

		this.changePassword = function(old_password, new_password) {
			var body = { password: old_password, new_password: new_password };
			return $http.post("api/users/" + this.id, body).then(function success(response) {
				self.setData(response.data);
			});
		};

		this.setData(user);
	};
});

app.factory("Users", function($http, $log, $uibModal, User) {
	var currentUser = undefined;

	function parseList(response) {
		return response.map(function(u, i, a) {
			return new User(u);
		});
	}

	function whoami() {
		return $http.get("/api/whoami").then(function success(response) {
			return new User(response.data);
		});
	}

	whoami().then(function success(me) {
		currentUser = me;
	});

	return {
		getList: function() {
			return $http.get("/api/users").then(function success(response) {
				return parseList(response.data);
			});
		},

		isLoggedIn: function() {
			return angular.isDefined(currentUser);
		},

		login: function(username, password) {
			var body = { username: username, password: password };
			return $http.post("/api/login", body).then(function succeed(response) {
				currentUser = new User(response.data);
				return currentUser;
			});
		},

		logout: function() {
			currentUser = undefined;
			return $http.post("/api/logout"); // we don't really care whether that succeeded or not
		},

		isCurrent: function(user) {
			return this.isLoggedIn() && currentUser.username === user.username;
		},

		getCurrent: function() {
			return currentUser;
		},

		create: function(username, password) {
			var self = this;
			var body = { username: username, password: password };
			return $http.post("/api/users", body).then(function success(response) {
				return new User(response.data);
			});
		},

		select: function() {
			var self = this;
			return $uibModal.open({
				animation: false,
				templateUrl: "users.html",
				controller: "UsersCtrl",
				size: "lg"
			}).result.then(function success(user) {
				if (angular.isDefined(user)) {
					$log.info("setting currentUser to " + user.username);
					currentUser = user; // logged in
				} else {
					currentUser = undefined; // logged out
				}
			});
		}
	};
});

app.factory("Volume", function($http, LOCAL_VOLUME_ID) {
	return function(volume) {
		this.setData = function(vol) {
			if (angular.isDefined(vol)) {
				angular.extend(this, vol);
			}
			return this;
		};

		this.getPath = function(id) {
			return "/api/volumes/" + encodeURIComponent(id || this.id) + "/";
		};

		this.load = function(id) {
			var self = this;
			$http.get(self.getPath(id)).then(function success(response) {
				return self.setData(response.data);
			});
		};

		this.getIcon = function() {
			switch (this.id) {
				case LOCAL_VOLUME_ID: return "fa-hdd-o";
				case "dropbox": return "fa-dropbox";
				case "google": return "fa-google";
				case "amazon": return "fa-amazon";
			}
			return (this.interface === "usb") ? "fa-usb" : ((this.interface === "network") ? "fa-server" : "fa-share-alt");
		};

		this.isLocal = function() {
			return this.id === LOCAL_VOLUME_ID;
		};

		this.setData(volume);
	};
});

app.factory("Volumes", function($http, $uibModal, Volume, LOCAL_VOLUME_ID) {
	var currentVolume = undefined;

	function getPath(volume) {
		return "/api/volumes/" + encodeURIComponent(volume || "");
	}

	function getLocal() {
		return $http.get(getPath(LOCAL_VOLUME_ID)).then(function success(response) {
			return new Volume(response.data);
		});
	}

	function parseList(response) {
		return response.data.map(function(v, i, a) {
			return new Volume(v);
		});
	}

	getLocal().then(function success(local) {
		currentVolume = local;
	})

	return {
		getList: function() {
			return $http.get(getPath()).then(function success(response) {
				return parseList(response);
			});
		},

		getLocal: function() {
			return getLocal();
		},

		isCurrent: function(volume) {
			return angular.isDefined(currentVolume) && currentVolume.id === volume.id;
		},

		getCurrent: function() {
			return currentVolume;
		},

		select: function() {
			return $uibModal.open({
				animation: false,
				templateUrl: "storage.html",
				controller: "StorageCtrl",
				size: "lg"
			}).result.then(function success(volume) {
				currentVolume = volume;
			});
		},

		mount: function(volume) {
			return $http.post(volume.getPath() + "mount").then(function success(response) {
				return new Volume(response.data);
			});
		},

		unmount: function(volume) {
			return $http.post(volume.getPath() + "unmount").then(function succeed(response) {
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
			if (angular.isUndefined(doc)) {
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
			var body = self.content;
			var hdrs = { "Content-Type": "text/plain" };
			return $http.put(this.getPath(volume, nameOverride), body, { headers: hdrs }).then(function success(response) {
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
			return this.isDirty() && this.content !== "";
		};

		this.shouldSave = function() {
			return this.isDirty();
		};

		this.setData(doc);
	};
});

app.factory("Documents", function($http, $uibModal, Document) {
	var currentDocument = new Document();

	return {
		getPath: function(volume) {
			return volume.getPath() + "files/";
		},

		getList: function(volume) {
			return $http.get(this.getPath(volume)).then(function success(response) {
				return response.data.map(function(v, i, a) {
					return new Document(v);
				});
			});
		},

		getCurrent: function() {
			return currentDocument;
		},

		select: function() {
			return $uibModal.open({
				animation: false,
				templateUrl: "docs.html",
				controller: "DocumentsCtrl",
				size: "lg"
			}).result.then(function success(selected) {
				return currentDocument.load(selected.volume, selected.doc.name);
			});
		},

		save: function() {
			return $uibModal.open({
				animation: false,
				templateUrl: "save_doc.html",
				controller: "SaveDocCtrl",
				size: "lg"
			}).result.then(function success(selected) {
				return currentDocument.save(selected.volume, selected.doc.name, false);
			});
		}
	};
});

app.factory("Lock", function($q, Users, Password, MessageBox) {
	var UNLOCKED = 0, LOCKED = 1, CHALLENGING = 2;
	var lockMode = 0;

	return {
		isUnlocked: function() {
			return lockMode === UNLOCKED;
		},

		isLocked: function() {
			return lockMode === LOCKED;
		},

		isChallenging: function() {
			return lockMode === CHALLENGING;
		},

		unlock: function() {
			lockMode = UNLOCKED;
		},

		lock: function() {
			lockMode = LOCKED;
		},

		challenge: function(timeout) {
			return $q(function(resolve, reject) {
				switch (lockMode) {
					case UNLOCKED:
						reject("not locked");
						break;

					case LOCKED:
						lockMode = CHALLENGING;
						if (Users.isLoggedIn()) {
							Password.challenge({
								title: "Enter Password to Unlock " + Users.getCurrent().username,
								timeout: timeout
							}).then(function success(response) {
								Users.login(Users.getCurrent().username, response.password).then(function success() {
									lockMode = UNLOCKED;
									resolve("unlocked");
								}, function failure() {
									lockMode = LOCKED;
									MessageBox.error({
										message: "Uh oh, you did not say the magic word!",
										timeout: timeout
									});
									reject("wrong password");
								});
							}, function failure() {
								lockMode = LOCKED;
								reject("dismissed password dialog");
							});
						} else {
							lockMode = UNLOCKED;
							resolve("unlocked");
						}
						break;

					case CHALLENGING:
						reject("already challenging");
						break;
				}
			});
		},
	};
});

app.controller("SoloWriterCtrl", function($scope, $window, $log, $http, $interval, $timeout, $uibModal, Idle, Keepalive, Settings, Lock, Users, Volumes, Documents, MessageBox, CONTENT_ID) {
	$scope.settings = Settings;
	$scope.currentDocument = Documents.getCurrent();
	$scope.showBackgroundImage = true;

	$scope.setDirty = function() {
		$scope.showBackgroundImage = false;
		Documents.getCurrent().setDirty();
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

	$scope.resetDoc = function(ask) {
		if (ask && Documents.getCurrent().isDirty()) {
			MessageBox.confirm({
				name: Documents.getCurrent().name
			}).then(function ok() {
				$scope.resetDoc(false); // call myself without prompting
			});
		} else {
			Documents.getCurrent().reset();
			$scope.showBackgroundImage = Settings.getBackgroundImage();
			$timeout(function() {
				setFocus(CONTENT_ID);
				setCaretToPos(CONTENT_ID, 0);
				scrollTop(CONTENT_ID, 0);
			});
		}
	};

	$scope.openDoc = function(ask) {
		if (ask && Documents.getCurrent().isDirty()) {
			MessageBox.confirm({
				name: Documents.getCurrent().name
			}).then(function ok() {
				$scope.openDoc(false); // call myself without prompting
			});
		} else {
			Documents.select().then(function success(doc) {
				$scope.currentDocument = doc;
				$scope.showBackgroundImage = false;
				$timeout(function () {
					setFocus(CONTENT_ID);
					setCaretToPos(CONTENT_ID, 0);
					scrollTop(CONTENT_ID, 0);
				});
			});
		}
	};

	$scope.saveDoc = function() {
		Documents.save().finally(function() {
			setFocus(CONTENT_ID);
		});
	};

	$scope.selectUser = function() {
		Users.select().finally(function() {
			setFocus(CONTENT_ID);
		});
	};

	$scope.selectStorage = function() {
		Volumes.select().finally(function() {
			setFocus(CONTENT_ID);
		});
	};

	$scope.selectSettings = function() {
		Settings.select().then(function succeed() {
			$scope.startLockScreen();
			$scope.startAutoSave();
		}).finally(function() {
			setFocus(CONTENT_ID);
		});
	};

	$scope.startLockScreen = function() {
		var lockScreenTime = Settings.getLockScreenTime();
		Idle.setTimeout(lockScreenTime.enabled ? lockScreenTime.asSec().current : 0);
	};

	$scope.startAutoSave = function() {
		var autoSaveTime = Settings.getAutoSaveTime();
		if (autoSaveTime.enabled) {
			Keepalive.setInterval(autoSaveTime.asSec().current);
		} else {
			Idle.keepalive(false);
		}
		Idle.setTimeout(autoSaveTime.asSec().current); // no-op to kick it
	};

	$scope.autoSave = function() {
		if (Documents.getCurrent().shouldSave() && Settings.getAutoSaveTime().enabled) {
			$log.info(now8601() + " -- autosaving");
			Documents.getCurrent().save(Volumes.getCurrent(), Settings.getAutoSaveName().name(Documents.getCurrent().getName()), true);
		} else {
			$log.debug(now8601() + " -- skipped autosave, nothing to save");
		}
	}

	$scope.lock = function() {
		if (Settings.getLockScreenTime().enabled) {
			$log.info("locking...");
			$scope.autoSave();
			Lock.lock();
			$timeout(angular.noop); // flush rendering
			$log.info("locked");
		}
	};	

	$scope.unlock = function() {
		if (Settings.getLockScreenTime().enabled) {
			$log.info("unlocking...");
			Lock.challenge(Idle.getTimeout() * 1000 / 3).then(function success() {
				$timeout(angular.noop); // flush rendering
				$log.info("unlocked");
			});
		}
	};

	$scope.isLocked = function() {
		return Lock.isLocked();
	};

	$scope.$on("IdleStart", function() {
		// the user appears to have gone idle
		$log.debug("IdleStart");
	});

	$scope.$on("IdleWarn", function(e, countdown) {
		// follows after the IdleStart event, but includes a countdown until the user is considered timed out
		// the countdown arg is the number of seconds remaining until then.
		// you can change the title or display a warning dialog from here.
		// you can let them resume their session by calling Idle.watch()
		$log.debug("IdleWarn");
	});

	$scope.$on("IdleTimeout", function() {
		// the user has timed out (meaning idleDuration + timeout has passed without any activity)
		// this is where you"d log them out
		$log.debug("IdleTimeout");
		$scope.lock();
	});

	$scope.$on("IdleEnd", function() {
		// the user has come back from AFK and is doing stuff. if you are warning them, you can use this to hide the dialog
		$log.debug("IdleEnd");
		$scope.unlock();
	});

	$scope.$on("Keepalive", function() {
		// do something to keep the user's session alive
		$log.debug("Keepalive");
		$scope.autoSave();
	});

	$scope.startAutoSave();
});

app.controller("DocumentsCtrl", function ($scope, $uibModal, $uibModalInstance, Users, Volumes, Documents, MessageBox) {
	$scope.currentUser = Users.getCurrent();
	$scope.currentVolume = Volumes.getCurrent();
	$scope.documents = undefined;
	$scope.loading = false;

	function refresh() {
		$scope.loading = true;
		Documents.getList(Volumes.getCurrent()).then(function success(list) {
			$scope.documents = list;
		}).finally(function() {
			$scope.loading = false;
		});
	}

	$scope.userGreeting = function() {
		return angular.isDefined($scope.currentUser) ? ($scope.currentUser.username + "'s") : "Shared";
	};

	$scope.selectUser = function() {
		Users.select().then(function success() {
			$scope.currentUser = Users.getCurrent();
			refresh();
		});
	};

	$scope.selectStorage = function() {
		Volumes.select().then(function success() {
			$scope.currentVolume = Volumes.getCurrent();
			refresh();
		});
	};

	$scope.selectDoc = function(doc) {
		$uibModalInstance.close({ volume: Volumes.getCurrent(), doc: doc });
	};

	$scope.deleteDoc = function(doc) {
		MessageBox.confirm({
			name: doc.name,
			message: "Deleting document [" + doc.name + "]. Are you sure?"
		}).then(function ok() {
			doc.remove(Volumes.getCurrent());
			doc.removed = true;
		});
	};

	refresh();
});

app.controller("SaveDocCtrl", function ($scope, $uibModalInstance, $log, Users, Volumes, Documents) {
	$scope.currentVolume = Volumes.getCurrent();
	$scope.currentUser = Users.getCurrent();
	$scope.currentDocument = Documents.getCurrent();
	if (angular.isUndefined($scope.currentDocument.name) || $scope.currentDocument.name.trim().length == 0) {
		// Grab the first non-blank line from the document content to propose as the default name
		var line = $scope.currentDocument.content.match(/^\s*(.+)\s*$/m);
		if (angular.isDefined(line)) {
			$scope.currentDocument.name = line[0].trim();
		}
	}

	$scope.userGreeting = function() {
		return angular.isDefined($scope.currentUser) ? ($scope.currentUser.username + "'s") : "Shared";
	};

	$scope.selectUser = function() {
		Users.select().then(function success() {
			$scope.currentUser = Users.getCurrent();
		});
	};

	$scope.selectStorage = function() {
		Volumes.select().then(function success() {
			$scope.currentVolume = Volumes.getCurrent();
		});
	};

	$scope.ok = function() {
		$uibModalInstance.close({ volume: $scope.currentVolume, doc: $scope.currentDocument });
	};
});

app.controller("StorageCtrl", function ($scope, $uibModalInstance, $log, Volumes, MessageBox) {
	$scope.volumes = undefined;
	$scope.loading = true;

	Volumes.getList().then(function success(list) {
		$scope.volumes = list;
	}).finally(function() {
		$scope.loading = false;
	});

	$scope.isOperatingOn = function(volume) {
		// $log.info("operating on: " + volume.id + ": " + ($scope.loading === volume.id));
		return $scope.loading === volume.id;
	};

	$scope.isCurrent = function(volume) {
		return Volumes.isCurrent(volume);
	};

	$scope.isMountable = function(volume) {
		var v = !volume.mounted && volume.can_mount && !$scope.isOperatingOn(volume);
		$log.info("isMountable(" + volume.id + "): " + v);
		return v;
	};

	$scope.isUnmountable = function(volume) {
		var v = volume.mounted && volume.can_unmount && !$scope.isOperatingOn(volume);
		$log.info("isUnmountable(" + volume.id + "): " + v);
		return v;
	};

	$scope.isSelectable = function(volume) {
		return volume.mounted && !$scope.isOperatingOn(volume);
	};

	$scope.select = function(volume) {
		$uibModalInstance.close(volume);
	};

	$scope.mount = function(volume) {
		$scope.loading = volume.id;
		Volumes.mount(volume).then(function success(vol) {
			volume = vol;
		}, function failure() {
			MessageBox.error({
				message: "Failed to connect [" + volume.name + "]"
			});
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.unmount = function(volume) {
		$scope.loading = volume.id;
		$timeout(angular.noop);
		Volumes.unmount(volume).then(function success(vol) {
			volume = vol;
		}, function failure() {
			MessageBox.error({
				message: "Failed to disconnect [" + volume.name + "]"
			});
		}).finally(function() {
			$scope.loading = false;
		});
	};
});

app.controller("SettingsCtrl", function ($scope, $uibModalInstance, $log, Settings, Volumes) {
	$scope.textSize = Settings.getTextSize();
	$scope.autoSaveTime = Settings.getAutoSaveTime().asMin();
	$scope.autoSaveName = Settings.getAutoSaveName();
	$scope.lockScreenTime = Settings.getLockScreenTime().asMin();
	$scope.lockScreenInterval = Settings.getLockScreenInterval().asSec();
	$scope.backgroundImage = Settings.getBackgroundImage();
	$scope.fonts = [
		"Georgia",
		"Verdana",
		"Arial",
		"Times New Roman"
	];

	$scope.selectStorage = function() {
		Volumes.select();
	};

	$scope.ok = function() {
		$uibModalInstance.close({
			textSize: $scope.textSize,
			autoSaveTime: $scope.autoSaveTime.restore(),
			autoSaveName: $scope.autoSaveName,
			lockScreenTime: $scope.lockScreenTime.restore(),
			lockScreenInterval: $scope.lockScreenInterval.restore(),
			backgroundImage: $scope.backgroundImage
		});
	};
});

app.controller("UsersCtrl", function ($scope, $log, $uibModalInstance, Users, Password, MessageBox) {
	$scope.users = undefined;
	$scope.currentUser = Users.getCurrent();
	$scope.username = "";
	$scope.password = "";

	function refresh() {
		$scope.loading = true;
		Users.getList().then(function success(list) {
			$scope.users = list;
			$scope.currentUser = Users.getCurrent();
		}).finally(function() {
			$scope.loading = false;
		});
	}

	$scope.isCurrent = function(user) {
		return Users.isCurrent(user);
	};

	$scope.loginUser = function(user) {
		Password.challenge({
			for: user.username
		}).then(function success(response) {
			$scope.loading = true;
			Users.login(user.username, response.password).then(function success(user) {
				$log.info("logged in as " + user.username);
				$uibModalInstance.close(user);
			}, function failure() {
				MessageBox.error({
					message: "Failed to login as " + user.username
				});
			}).finally(function() {
				$scope.loading = false;
			});
		});
	};

	$scope.logoutUser = function(user) {
		$scope.loading = true;
		Users.logout().then(function success() {
			$uibModalInstance.close(undefined);
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.addUser = function(username, password) {
		$scope.loading = true;
		Users.create(username, password).then(function success(user) {
			$scope.users.push(user);
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
			user.remove(password.password).then(function success() {
				refresh();
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
			user.changeUsername(response.password, response.new_username).then(function success(user) {
				// no-op
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
			user.changePassword(response.password, response.new_password).then(function success(user) {
				// no-op
			}, function failure() {
				MessageBox.error({
					message: "Failed to change password of " + user.username
				});
			}).finally(function() {
				$scope.loading = false;
			});
		});
	};

	refresh();
});

app.service("Password", function($uibModal) {
	this.challenge = function(extra) {
		if (angular.isUndefined(extra)) {
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

app.service("MessageBox", function($uibModal) {
	this.confirm = function(options) {
		options.title || (options.title = "Confirm");
		options.message || (options.message = "Unsaved modifications in document [" + options.name + "] will be lost. Are you sure?");
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

app.controller("MessageBoxCtrl", function ($scope, $uibModalInstance, $timeout, options) {
	$scope.options = angular.copy(options);

	if (angular.isDefined($scope.options.timeout)) {
		$scope.autoClose = $timeout(function () {
			$scope.cancel("timeout");
		}, $scope.options.timeout);
	} else {
		$scope.autoClose = undefined;
	}

	function cleanup() {
		if (angular.isDefined($scope.autoClose)) {
			$timeout.cancel($scope.autoClose);
			$scope.autoClose = undefined;
		}
	}

	$scope.ok = function() {
		cleanup();
		$uibModalInstance.close("ok");
	};

	$scope.cancel = function(reason) {
		cleanup();
		$uibModalInstance.dismiss(reason || "cancel");
	};
});

app.controller("SlideShowCtrl", function ($scope, Settings) {
	$scope.interval = Settings.getLockScreenInterval().asMs().current;
	$scope.active = 0;

	$scope.slides = [ ];
	for(var i = 1; i <= 60; ++i) {
		$scope.slides.push({
			image: "/images/slides/slide-" + i + ".jpg"
		});
	}
});

app.filter("bytes", function() {
	return function(bytes, precision) {
		if (bytes === 0 || isNaN(parseFloat(bytes)) || !isFinite(bytes)) return "-";
		if (angular.isUndefined(precision)) precision = 1;
		var units = [ "B", "KB", "MB", "GB", "TB", "PB" ];
		var number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + " " + units[number];
	}
});

app.directive("ngEnter", function () {
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

app.directive('ngCheckbox', function() {
	return {
		restrict: 'E',
		require: 'ngModel',
		replace: true,
		transclude: true,
		template: '<span class="fa" role="button" ng-class="isChecked ? \'fa-check-square-o\' : \'fa-square-o\'" ng-click="toggleMe()"><ng-transclude/></span>',
		scope: { isChecked: '=?' },
		link: function(scope, elem, attrs, model) {
			model.$formatters.unshift(function(value) {
				scope.isChecked = value == true;
				return value;
            });

			scope.toggleMe = function() {
				scope.isChecked = !scope.isChecked;
				model.$setViewValue(scope.isChecked);
			}
		}
	}
});
