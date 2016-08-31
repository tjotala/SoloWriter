app.factory("Document", function($http, DEFAULT_DOCUMENT_NAME) {
	function countCharacters(content) {
		matches = content.match(/[\w\d\-]/gm);
		return matches ? matches.length : 0;
	}

	function countWords(content) {
		matches = content.match(/\w[\w\d\-]*/gm);
		return matches ? matches.length : 0;
	}

	return function(doc) {
		this.setData = function(doc) {
			clearObj(this);
			angular.extend(this, doc);
			this.clearDirty();
			return this;
		};

		this.getPath = function(volume, newName) {
			return volume.getPath() + "files/" + encodeURIComponent(angular.isDefined(newName) ? newName : this.name);
		};

		this.getSafeName = function() {
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

		this.send = function(email) {
			var self = this;
			var body = {
				sender: email.sender,
				password: email.password,
				recipient: email.recipient || email.sender,
				subject: email.subject || self.getSafeName() || "Your Document",
				content: self.content
			};
			return $http.post("/api/send", body);
		};

		this.remove = function(volume) {
			return $http.delete(this.getPath(volume));
		};

		this.lock = function(volume) {
			var self = this;
			return $http.put(this.getPath(volume) + "/lock").then(function success(response) {
				return self.setData(response.data);
			});
		};

		this.unlock = function(volume) {
			var self = this;
			return $http.put(this.getPath(volume) + "/unlock").then(function success(response) {
				return self.setData(response.data);
			});
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

		this.count = function() {
			return {
				characters: countCharacters(this.content),
				words: countWords(this.content),
			};
		};

		this.setData(doc);
	};
});

app.factory("Documents", function($http, $uibModal, Document, MessageBox, Email) {
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
				templateUrl: "dialogs/open_doc.html",
				controller: "OpenDocCtrl",
				size: "lg"
			}).result.then(function success(selected) {
				return currentDocument.load(selected.volume, selected.doc.name).then(function success(doc) {
					return doc;
				}, function failure() {
					MessageBox.error({
						message: "Failed to open [" + selected.doc.name + "]"
					});
				});
			});
		},

		save: function() {
			var self = this;
			return $uibModal.open({
				animation: false,
				templateUrl: "dialogs/save_doc.html",
				controller: "SaveDocCtrl",
				size: "lg"
			}).result.then(function success(selected) {
				return currentDocument.save(selected.volume, selected.doc.name, false).then(function success(doc) {
					return doc;
				}, function failure() {
					MessageBox.error({
						message: "Failed to save as [" + selected.doc.name + "]"
					});
				});
			});
		},

		send: function() {
			var self = this;
			var default_email = {
				sender: undefined,
				password: undefined,
				recipient: undefined,
				subject: "Document: " + currentDocument.getSafeName()
			};
			return Email.address(default_email).then(function success(email) {
				return currentDocument.send(email).then(function success() {
					MessageBox.success({
						message: "Sent [" + currentDocument.getSafeName() + "] to [" + email.recipient + "]"
					});
				}, function failure() {
					MessageBox.error({
						message: "Failed to send [" + currentDocument.getSafeName() + "] to [" + email.recipient + "]"
					});
				});
			});
		}
	};
});

app.controller("OpenDocCtrl", function ($scope, $uibModal, $uibModalInstance, Users, Volumes, Documents, MessageBox) {
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

	$scope.lockDoc = function(doc) {
		doc.lock(Volumes.getCurrent()).then(function success(locked_doc) {
			doc = locked_doc;
		}, function failure() {
			MessageBox.error({
				message: "Failed to lock [" + doc.name + "]"
			});
		});
	};

	$scope.unlockDoc = function(doc) {
		doc.unlock(Volumes.getCurrent()).then(function success(unlocked_doc) {
			doc = unlocked_doc;
		}, function failure() {
			MessageBox.error({
				message: "Failed to unlock [" + doc.name + "]"
			});
		});
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
	$scope.counts = $scope.currentDocument.count();
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
