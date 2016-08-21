require 'document'

class Documents
	def initialize(volume, user)
		@volume = volume
		@user = user || GlobalUser.new
	end

	def list
		Dir[File.join(path, '*')].reject { |path| self.class.exclude?(path) }.map { |path| Document.new(path) }
	end

	def get(base_name)
		Document.new(File.join(path, base_name))
	end

	def path
		p = File.join(@volume.path, @user.username.to_s)
		FileUtils.mkdir_p(p)
		p
	end

	private

	class GlobalUser
		def username
			''
		end
	end

	class << self
		def exclude?(path)
			File.directory?(path) || path =~ /^(?:\..+|System Volume Information)/
		end
	end
end
