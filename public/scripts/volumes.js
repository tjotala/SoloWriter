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
				templateUrl: "dialogs/storage.html",
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

app.controller("StorageCtrl", function ($scope, $uibModalInstance, $log, Volumes, MessageBox) {
	$scope.volumes = undefined;
	$scope.loading = false;

	function refresh() {
		$scope.lodaing = true;
		Volumes.getList().then(function success(list) {
			$scope.volumes = list;
		}).finally(function() {
			$scope.loading = false;
		});
	}

	$scope.isOperatingOn = function(volume) {
		return $scope.loading === volume.id;
	};

	$scope.isCurrent = function(volume) {
		return Volumes.isCurrent(volume);
	};

	$scope.isMountable = function(volume) {
		return !volume.mounted && volume.can_mount && !$scope.isOperatingOn(volume);
	};

	$scope.isUnmountable = function(volume) {
		return volume.mounted && volume.can_unmount && !$scope.isOperatingOn(volume);
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
			volume.setData(vol);
		}, function failure() {
			MessageBox.error({
				message: "Failed to connect [" + volume.label + "]"
			});
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.unmount = function(volume) {
		$scope.loading = volume.id;
		Volumes.unmount(volume).then(function success(vol) {
			volume.setData(vol);
			MessageBox.success({
				message: "It is now safe to remove [" + volume.label + "]"
			});
		}, function failure() {
			MessageBox.error({
				message: "Failed to disconnect [" + volume.label + "]"
			});
		}).finally(function() {
			$scope.loading = false;
		});
	};

	refresh();
});
