require_relative 'document'

class Documents
	def self.list(base_path)
		Dir[File.join(base_path, '**')].map { |path| Document.absolute(path, base_path) }
	end
end
