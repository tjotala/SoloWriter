function DocumentStore() {
	var self = this;

	this.list = function(callback) {
		$.ajax("/api/files/",
			{
				method: "GET",
				success: function(data, textStatus, jqXHR) {
					callback(true, textStatus, $.map(data, function(doc, i) {
						doc.modified = new Date(Date.parse(doc.modified));
						return doc;
					}));
				},
				error: function(jqXHR, textStatus, error) {
					callback(false, textStatus, error);
				}
			});
	}

	this.get = function(name, callback) {
		$.ajax("/api/files/" + encodeURIComponent(name),
			{
				method: "GET",
				success: function(data, textStatus, jqXHR) {
					callback(true, textStatus, {
						name: name,
						size: parseInt(jqXHR.getResponseHeader("Content-Length")),
						content: data,
						modified: new Date(Date.parse(jqXHR.getResponseHeader("Last-Modified")))
					});
				},
				error: function(jqXHR, textStatus, error) {
					callback(false, textStatus, error);
				}
			});
	}

	this.set = function(doc, callback) {
		$.ajax("/api/files/" + encodeURIComponent(doc.name),
			{
				method: "PUT",
				dataType: "text/plain",
				data: doc.content,
				success: function(data, textStatus, jqXHR) {
					callback(true, textStatus);
				},
				error: function(jqXHR, textStatus, error) {
					callback(false, textStatus, error);
				}
			});
	}

	this.remove = function(name, callback) {
		$.ajax("/api/files/" + encodeURIComponent(name),
			{
				method: "DELETE",
				success: function(data, textStatus, jqXHR) {
					callback(true, textStatus);
				},
				error: function(jqXHR, textStatus, error) {
					callback(false, textStatus, error);
				}
			});
	}

	return this;
}
