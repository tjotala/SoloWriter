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


app.service("MessageBox", function($uibModal) {
	this.confirm = function(options) {
		options.title || (options.title = "Confirm?");
		options.message || (options.message = "Unsaved modifications in document [" + options.name + "] will be lost. Are you sure?");
		return this.prompt(options);
	};

	this.error = function(options) {
		options.title || (options.title = "Error!");
		options.ok_only = true;
		return this.prompt(options);
	};

	this.success = function(options) {
		options.title || (options.title = "Success!");
		options.ok_only = true;
		return this.prompt(options);
	};

	this.prompt = function(options) {
		return $uibModal.open({
			animation: false,
			templateUrl: "dialogs/messagebox.html",
			controller: "MessageBoxCtrl",
			size: "sm",
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
