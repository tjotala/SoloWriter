function DocumentStore() {
	var self = this;

	this.get = function(name) {
		var dateTimeReviver = function(key, value) {
    		if (typeof(value) === 'string' && value.match(/\d{4}-\d{2}-\d{2}T/)) {
           		return new Date(Date.parse(value));
    		}
    		return value;
		}
		return JSON.parse(localStorage.getItem(name), dateTimeReviver);
	}

	this.set = function(doc, callback) {
		localStorage.setItem(doc.name, JSON.stringify(doc));
		callback();
	}

	this.remove = function(name, callback) {
		localStorage.removeItem(name);
		callback();
	}

	this.count = function() {
		return localStorage.length;
	}

	this.list = function(callback) {
		for (var i = 0; i < self.count(); ++i)
		{
			callback(localStorage.key(i));
		}
	}

	return this;
}
