require 'fileutils'

class Document
	attr_reader :path

	def initialize(path)
		@path = path
	end

	def create(content)
		File.open(@path, 'w') { |f| f.write(content) }
		self
	end

	def remove
		File.unlink(@path)
		self
	end

	def lock
		FileUtils.chmod('u=r,go=rr', @path)
		self
	end

	def unlock
		FileUtils.chmod('u=rw,go=rr', @path)
		self
	end

	def to_json(*args)
		stat = File.stat(@path)
		{
			name: File.basename(@path),
			size: stat.size,
			created: stat.ctime.iso8601,
			modified: stat.mtime.iso8601,
			locked: !stat.writable?,
		}.to_json(args)
	end
end
