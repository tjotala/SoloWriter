app.factory("Network", function($http, $log) {
	return function(network) {
		this.setData = function(net) {
			if (angular.isDefined(net)) {
				clearObj(this); // clear any previous fields
				angular.extend(this, net);
			}
			return this;
		};

		this.getPath = function(interface) {
			return "/api/networks/" + encodeURIComponent(interface || this.interface) + "/";
		};

		this.load = function(interface) {
			var self = this;
			$http.get(self.getPath(interface)).then(function success(response) {
				return self.setData(response.data);
			});
		};

		this.getName = function() {
			if (this.isEthernet()) {
				return "Wired";
			} else if (this.isWireless()) {
				return "Wireless";
			}
			return "Unknown";
		};

		this.getIcon = function() {
			if (this.isEthernet()) {
				return "fa-exchange";
			} else if (this.isWireless()) {
				return "fa-wifi";
			}
			return "fa-blind";
		};

		this.isEthernet = function() {
			return this.type == "ethernet";
		};

		this.isWireless = function() {
			return this.type == "wireless";
		};

		this.isForgettable = function() {
			return this.known;
		};

		this.isConnected = function() {
			return this.connected;
		};

		this.isConnectable = function() {
			return this.isWireless() && !this.isConnected();
		};

		this.isDisconnectable = function() {
			return this.isWireless() && this.isConnected();
		};

		this.isSwitchable = function() {
			return this.isWireless();
		};

		this.connect = function(password) {
			var self = this;
			var body = { ssid: this.ssid };
			if (angular.isDefined(password)) {
				body.password = password;
			}
			return $http.post(self.getPath(this.interface) + "connect", body).then(function success(response) {
				return self.setData(response.data);
			});
		};

		this.disconnect = function() {
			var self = this;
			return $http.post(self.getPath(this.interface) + "disconnect").then(function success(response) {
				return self.setData(response.data);
			});
		};

		this.forget = function() {
			var self = this;
			var body = { ssid: this.ssid };
			return $http.post(self.getPath(this.interface) + "forget", body).then(function success(response) {
				return self.setData(response.data);
			});
		};

		this.setData(network);
	};
});

app.factory("Networks", function($http, $uibModal, $interval, $log, Network) {
	function getPath(network) {
		return "/api/networks/" + encodeURIComponent(network || "");
	}

	function parseList(response) {
		return response.map(function(n, i, a) {
			return new Network(n);
		});
	}

	function getAvailableList() {
		return $http.get(getPath("available")).then(function success(response) {
			return parseList(response.data);
		});
	}

	function scanForNetwork() {
		$log.debug("scan for active network...");
		return getAvailableList().then(
			function success(list) {
				for(var net in list) {
					if (list[net].isConnected()) {
						return true; // we only need to find one live one
					}
				}
				return false;
			}, function failure() {
				return false;
			}
		);
	}

	var lastNetworkStatus = scanForNetwork();
	$interval(function() { lastNetworkStatus = scanForNetwork(); }, 15 * 1000);

	return {
		getAvailableList: getAvailableList,

		getWirelessList: function(interface) {
			return $http.get(getPath(interface) + "/scan").then(function success(response) {
				return parseList(response.data);
			});
		},

		hasNetwork: function() {
			return lastNetworkStatus;
		},

		select: function() {
			return $uibModal.open({
				animation: false,
				templateUrl: "dialogs/networks.html",
				controller: "NetworkCtrl",
				size: "lg"
			}).result;
		}
	};
});

app.controller("NetworkCtrl", function ($scope, $uibModal, $uibModalInstance, $log, $interval, Networks, MessageBox) {
	$scope.networks = undefined;
	$scope.loading = false;

	function refresh() {
		$scope.loading = true;
		Networks.getAvailableList().then(function success(list) {
			$scope.networks = list;
		}).finally(function() {
			$scope.loading = false;
		});
	}

	function startScan() {
		stopScan();
		refresh();
		$scope.scanner = $interval(function() { refresh(); }, 10000);
	}

	function stopScan() {
		if (angular.isDefined($scope.scanner)) {
			$interval.cancel($scope.scanner);
			$scope.scanner = undefined;
		}
	}

	$scope.isOperatingOn = function(network) {
		return network.interface === $scope.loading;
	};

	$scope.connect = function(network) {
		$uibModal.open({
			animation: false,
			templateUrl: "dialogs/wireless.html",
			controller: "WirelessNetworkCtrl",
			size: "lg",
			resolve: {
				interface: function() {
					return network.interface;
				}
			}
		}).result.then(function success(connected) {
			network.setData(connected);
		});
	};

	$scope.disconnect = function(network) {
		$scope.loading = network.interface;
		network.disconnect(network).then(function success(disconnected) {
			network.setData(disconnected);
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.cancel = function() {
		stopScan();
		$uibModalInstance.dismiss('cancel');
	};

	startScan();
});

app.controller("WirelessNetworkCtrl", function ($scope, $uibModalInstance, $log, $interval, Networks, Password, MessageBox, interface) {
	$scope.interface = interface;
	$scope.networks = undefined;
	$scope.loading = false;

	function refresh() {
		$scope.loading = true;
		$log.debug("scanning wireless networks on " + $scope.interface);
		Networks.getWirelessList($scope.interface).then(function success(list) {
			$scope.networks = list;
		}).finally(function() {
			$scope.loading = false;
		});
	}

	function startScan() {
		stopScan();
		refresh();
		$scope.scanner = $interval(function() { refresh(); }, 10000);
	}

	function stopScan() {
		if (angular.isDefined($scope.scanner)) {
			$interval.cancel($scope.scanner);
			$scope.scanner = undefined;
		}
	}

	$scope.isOperatingOn = function(network) {
		return network.ssid === $scope.loading;
	};

	$scope.forget = function(network) {
		$scope.loading = network.ssid;
		network.forget().then(function success(forgotten) {
			network.setData(forgotten);
		}).finally(function() {
			$scope.loading = false;
		});
	};

	$scope.connect = function(network) {
		stopScan();
		if (network.encryption && !network.known) {
			Password.challenge({
				title: "Enter Wireless Password for " + network.ssid
			}).then(function success(response) {
				$scope.loading = network.ssid;
				network.connect(response.password).then(function success(connected) {
					$uibModalInstance.close(connected);
				}, function failure() {
					MessageBox.error({
						message: "Failed to connect to " + network.ssid
					});
				}).finally(function() {
					$scope.loading = false;
				});
			});
		} else {
			$scope.loading = network.ssid;
			network.connect(undefined).then(function success(connected) {
				$uibModalInstance.close(connected);
			}, function failure() {
				MessageBox.error({
					message: "Failed to connect to " + network.ssid
				});
			}).finally(function() {
				$scope.loading = false;
			});
		}
	};

	$scope.cancel = function() {
		stopScan();
		$uibModalInstance.dismiss('cancel');
	};

	startScan();
});
