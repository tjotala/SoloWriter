class Document
	attr_reader :path

	def initialize(path)
		@path = path
	end

	def create(content)
		File.open(@path, 'w') { |f| f.write(content) }
	end

	def remove
		File.unlink(@path)
	end

	def to_json(*args)
		stat = File.stat(@path)
		{ name: File.basename(@path), size: stat.size, modified: stat.mtime.iso8601 }.to_json(args)
	end
end
