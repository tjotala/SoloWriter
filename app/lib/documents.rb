require 'document'

class Documents
	class GlobalUser
		def username
			''
		end
	end

	def initialize(volume, user)
		@volume = volume
		@user = user || GlobalUser.new
	end

	def list
		Dir[File.join(path, '**')].map { |path| Document.new(path) }
	end

	def get(base_name)
		Document.new(File.join(path, base_name))
	end

	private

	def path
		File.join(@volume.path, @user.username)
	end
end
