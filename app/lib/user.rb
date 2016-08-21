require 'openssl'
require 'base64'
require 'json'

require 'errors'
require 'username'
require 'password'
require 'token'

class User
	include Comparable
	attr_reader :username
	attr_reader :password

	def password?(password)
		@password.match?(password)
	end

	def new_password(password)
		@password = Password.create(password)
	end

	def new_token
		Token.create(username).encode
	end

	def save
		File.open(self.class.path(@username), 'w') { |f| f.write(encode) }
		self
	end

	def delete
		File.delete(self.class.path(@username))
	end

	def to_json(*args)
		{
			username: @username.to_s,
		}.to_json(args)
	end

	def <=>(other)
		self.username <=> other.username && self.password <=> other.password
	end

	def encode
		JSON.generate({ username: @username.encode, password: @password.encode })
	end

	class << self
		def create(username, password)
			self.new(Username.create(username), Password.create(password))
		end

		def decode(encoded)
			user = JSON.parse(encoded, :symbolize_names => true)
			self.new(Username.decode(user[:username]), Password.decode(user[:password]))
		end

		def from_json(json)
			decode(json)
		end

		def from_path(path)
			from_json(File.open(path, 'r').read)
		rescue Errno::ENOENT
			unauthorized
		end

		def from_name(username)
			from_path(path(username))
		end

		def from_token(token)
			from_name(Token.decode(token).username)
		end

		def exist?(username)
			File.exist?(path(username))
		end

		def path(username)
			File.join(Platform::USERS_PATH, username.to_s)
		end
	end

	private

	def initialize(username, password)
		@username = username
		@password = password
	end
end
