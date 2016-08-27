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
