function RangeOption(values) {
	this.setData = function(other) {
		clearObj(this);
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

app.factory("Settings", function($window, $interpolate, $uibModal, $http, $log, CONTENT_ID, DEFAULT_DOCUMENT_NAME, moment) {

	var textSize = new RangeOption({
		enabled: true,
		min: 10, // px
		max: 50, // px
		step: 2, // px
		units: "px",
		default: parseFloat($window.getComputedStyle(getById(CONTENT_ID)).getPropertyValue("font-size")),
		font: $window.getComputedStyle(getById(CONTENT_ID)).getPropertyValue("font-family"),
		getSaved: function() { return { enabled: this.enabled, current: this.current, font: this.font }; },
		setFrom: function(other) { this.enabled = other.enabled; this.current = other.current; this.font = other.font; },
		asStyle: function() { return { 'font-size': this.current + this.units, 'font-family': this.font }; }
	});

	var autoSaveTime = new RangeOption({
		enabled: true,
		min: 0.5 * 60 * 1000, // ms
		max: 5 * 60 * 1000, // ms
		step: 0.5 * 60 * 1000, // ms
		default: 1 * 60 * 1000, // ms
		getSaved: function() { return { enabled: this.enabled, current: this.current }; },
		setFrom: function(other) {this.enabled = other.enabled; this.current = other.current; }
	});
	var autoSaveName = {
		enabled: true,
		pattern: "{{name}}.autosave", // this is run through $interpolate(pattern)({ name: <filename> })
		name: function(fill) { return $interpolate(this.pattern)({ name: angular.isDefined(fill) ? fill : DEFAULT_DOCUMENT_NAME}); },
		getSaved: function() { return { enabled: this.enabled }; },
		setFrom: function(other) { this.enabled = other.enabled; }
	};

	var lockScreenTime = new RangeOption({
		enabled: true,
		min: 1 * 60 * 1000, // ms
		max: 10 * 60 * 1000, // ms
		step: 1 * 60 * 1000, // ms
		default: 1 * 60 * 1000, // ms
		getSaved: function() { return { enabled: this.enabled, current: this.current }; },
		setFrom: function(other) { this.enabled = other.enabled; this.current = other.current; }
	});
	var lockScreenInterval = new RangeOption({
		enabled: true,
		min: 10 * 1000, // ms
		max: 60 * 1000, // ms
		step: 5 * 1000, // ms
		default: 10 * 1000, // ms
		set: "family",
		getSaved: function() { return { enabled: this.enabled, current: this.current, set: this.set }; },
		setFrom: function(other) { this.enabled = other.enabled; this.current = other.current; this.set = other.set; }
	});

	var backgroundImage = true;
	var devMode = false;  // true = development mode, false = not development mode

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

		getLockScreenSets: function() {
			return $http.get("/api/volumes/any/slides/").then(function success(response) {
				return response.data;
			});
		},
		getLockScreenImages: function(set) {
			return $http.get("/api/volumes/any/slides/" + set + "/images").then(function success(response) {
				return response.data;
			});
		},

		getTimeZone: function(tz) {
			if (angular.isDefined(moment.defaultZone) && moment.defaultZone != null) {
				return moment.defaultZone.name;
			}
			return moment.tz.guess();
		},
		setTimeZone: function(tz) {
			moment.tz.setDefault(tz);
		},

		select: function() {
			var self = this;
			return $uibModal.open({
				animation: false,
				templateUrl: "dialogs/settings.html",
				controller: "SettingsCtrl",
				size: "lg"
			}).result.then(function success(settings) {
				self.setAll(settings);
			});
		},

		getAll: function() {
			return {
				textSize: textSize.getSaved(),
				autoSaveTime: autoSaveTime.getSaved(),
				autoSaveName: autoSaveName.getSaved(),
				lockScreenTime: lockScreenTime.getSaved(),
				lockScreenInterval: lockScreenInterval.getSaved(),
				backgroundImage: backgroundImage,
				timezone: this.getTimeZone()
			};
		},

		setAll: function(saved) {
			this.setTextSize(saved.textSize);
			this.setAutoSaveTime(saved.autoSaveTime);
			this.setAutoSaveName(saved.autoSaveName);
			this.setLockScreenTime(saved.lockScreenTime);
			this.setLockScreenInterval(saved.lockScreenInterval);
			this.setBackgroundImage(saved.backgroundImage);
			this.setTimeZone(saved.timezone);
		}
	};
});

app.controller("SettingsCtrl", function ($scope, $uibModalInstance, $log, Settings, Volumes, Networks) {
	$scope.textSize = Settings.getTextSize();
	$scope.autoSaveTime = Settings.getAutoSaveTime().asMin();
	$scope.autoSaveName = Settings.getAutoSaveName();
	$scope.lockScreenTime = Settings.getLockScreenTime().asMin();
	$scope.lockScreenInterval = Settings.getLockScreenInterval().asSec();
	$scope.backgroundImage = Settings.getBackgroundImage();
	$scope.fonts = [
		"serif",
		"sans-serif",
		"monospace"
	];
	for(var i in $scope.fonts) {
		if ($scope.fonts[i] == $scope.textSize.font) {
			$scope.textSize.font = $scope.fonts[i];
			break;
		}
	}
	Settings.getLockScreenSets().then(function success(sets) {
		$scope.lockScreenSets = sets;
		$scope.lockScreenSet = sets[0]; // just in case we can't find the current one
		for(var i in sets) {
			if (sets[i].id == $scope.lockScreenInterval.set) {
				$scope.lockScreenSet = sets[i];
				break;
			}
		}
	});
	$scope.timezones = [
		"Pacific/Honolulu",
		"America/Anchorage",
		"America/Los_Angeles",
		"America/Denver",
		"America/Chicago",
		"America/New_York"
	];
	var tz = Settings.getTimeZone();
	for(var i in $scope.timezones) {
		if ($scope.timezones[i] == tz) {
			$scope.timezone = $scope.timezones[i];
		}
	}

	$scope.now = function() {
		return (new moment()).tz($scope.timezone);
	};

	$scope.selectStorage = function() {
		Volumes.select();
	};

	$scope.selectNetwork = function() {
		Networks.select();
	};

	$scope.ok = function() {
		var interval = $scope.lockScreenInterval.restore();
		interval.set = $scope.lockScreenSet.id;
		$uibModalInstance.close({
			textSize: $scope.textSize,
			autoSaveTime: $scope.autoSaveTime.restore(),
			autoSaveName: $scope.autoSaveName,
			lockScreenTime: $scope.lockScreenTime.restore(),
			lockScreenInterval: interval,
			backgroundImage: $scope.backgroundImage,
			timezone: $scope.timezone
		});
	};
});
