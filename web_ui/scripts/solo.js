function Document(name, content, modified) {
	return {
		"name": name || "",
		"content": content || "",
		"modified": modified || new Date()
	};
}

function Editor(store) {
	var self = this;

	this.store = store;

	this.load = function(doc) {
		$("#list").hide();
		$("#editor").show();
		$("#name").val(doc.name);
		$("#content").val(doc.content);
		self.refreshButtons();
	}

	this.save = function() {
		var doc = new Document($("#name").val(), $("#content").val());
		store.set(doc, function(flag, status, data) { });
	}

	this.reset = function() {
		self.load(new Document());
	}

	this.open = function() {
		$("#list-rows").empty();
		$("#editor").hide();
		$("#list").show();

		var elem = function(tag) { return $("<" + tag + "></" + tag + ">"); }
		var td = function(txt) { return elem("td").text(txt); }

		var i = 0;
		store.list(function(flag, status, data) {
			$.each(data, function(i, doc) {
				console.log("document " + i + ": " + doc);
				var item = elem("tr");
				item.click(function() {
					store.get(doc.name, function(flag, status, data) {
						self.load(data);
					});
				});
				var index = td(++i);
				var name = td(doc.name);
				var modified = td(doc.modified.toLocaleString());
				var size = td(doc.size);
				item.append(index, name, modified, size);
				$("#list-rows").append(item);
			});
		});
	}

	this.remove = function() {
		store.remove($("#name").val(), function(flag, status, data) {
			self.reset();
		});
	}

	this.isEditKey = function(keyCode) {
		switch (keyCode) {
			case 37: // left
			case 38: // up
			case 39: // right
			case 40: // down
				return false;
		}
		return true;
	}

	this.refreshButtons = function() {
		var hasName = ($("#name").val() != "");
		$("#save").toggleClass("active", hasName).toggleClass("disabled", !hasName);
		$("#remove").toggleClass("active", hasName).toggleClass("disabled", !hasName);
	}

	$("#name").on("change cut paste keyup", function() {
		self.refreshButtons();
	});

	self.refreshButtons();
}

var store = undefined;
var editor = undefined;

$(document).ready(function() {
	store = new DocumentStore();
	editor = new Editor(store);
	editor.reset();
});
