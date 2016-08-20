require 'errors'

class Username
	include Comparable
	attr_reader :username

	PATTERN = /^[a-zA-Z0-9\-\._]+$/.freeze # basically safe characters for filenames/paths

	def to_s
		@username.to_s
	end

	def encode
		@username
	end

	def <=>(other)
		self.username <=> other.username
	end

	class << self
		def create(username)
			missing_argument(:username) if username.nil?
			invalid_argument(:username, "does not meet requirements") unless username =~ PATTERN
			self.new(username)
		end

		def decode(encoded)
			self.new(encoded)
		end
	end

	private

	def initialize(username)
		@username = username
	end
end
