app.factory("Song", function($http) {
	return function(song) {
		this.setData = function(song) {
			clearObj(this);
			angular.extend(this, song);
			return this;
		};

		this.play = function() {
			return $http.post(this.song);
		};

		this.setData(song);
	};
});

app.factory("Songs", function($http, $uibModal, Song) {
	var currentSong = undefined;
	var playlist = undefined;

	return {
		getPath: function(volume, set) {
			return volume.getPath() + "music/" + (angular.isDefined(set) ? (set + '/songs') : '');
		},

		getSongs: function(volume, set) {
			return $http.get(this.getPath(volume, set)).then(function success(response) {
				return response.data.map(function(v, i, a) {
					return new Song(v);
				});
			});
		},

		// getSets: function(volume) {
		// 	return $http.get(this.getPath(volume)).then(function success(response) {
		// 		return response.data.map(function(v, i, a) {
		// 			return new Song(v);
		// 		});
		// 	});
		// },

		select: function() {
			var self = this;
			return $uibModal.open({
				animation: false,
				templateUrl: "dialogs/music.html",
				controller: "MusicCtrl",
				size: "lg"
			}).result.then(function success(selected) {
				self.playlist = selected.songs;
				self.playlist[0].play();
			});
		},

	};
});

app.controller("MusicCtrl", function ($scope, $uibModal, $uibModalInstance, Volumes, Songs) {
	$scope.songs = undefined;
	$scope.loading = false;

	function refresh() {
		$scope.loading = true;
		Songs.getSongs(Volumes.getCurrent(), "JoCo").then(function success(list) {
			$scope.songs = list;
		}).finally(function() {
			$scope.loading = false;
		});
	}

	$scope.play = function(song) {
		$uibModalInstance.close({ songs: [ song ] });
	};

	refresh();
});
