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
				templateUrl: "dialogs/settings.html",
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
