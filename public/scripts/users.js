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
				templateUrl: "dialogs/users.html",
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
