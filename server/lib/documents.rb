require_relative 'document'

class Documents
	def initialize(volume)
		@volume = volume
	end

	def list
		Dir[File.join(@volume.path, '**')].map { |path| Document.new(path) }
	end

	def get(base_name)
		Document.new(File.join(@volume.path, base_name))
	end
end
