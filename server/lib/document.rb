class Document
	attr_reader :full_path, :base_path

	def self.relative(base_name, base_path)
		Document.new(File.join(base_path, base_name), base_path)
	end

	def self.absolute(full_path, base_path)
		Document.new(full_path, base_path)
	end

	def relative_path
		@full_path.gsub(/^#{@base_path}\//, '')
	end

	def write(content)
		File.open(@full_path, 'w') { |f| f.write(content) }
	end

	def remove
		File.unlink(@full_path)
	end

	def to_json(x = nil)
		stat = File.stat(@full_path)
		{ :name => relative_path, :size => stat.size, :modified => stat.mtime.iso8601 }.to_json(x)
	end

	private

	def initialize(full_path, base_path)
		@full_path = full_path
		@base_path = base_path
	end
end
