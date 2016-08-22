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
	attr_reader :last_modified
	attr_reader :last_login

	def password?(password)
		@password.match?(password)
	end

	def new_password(password)
		touch
		@password = Password.create(password)
		self
	end

	def new_token
		@last_login = self.class.now
		Token.create(@username.to_s).encode
	end

	def save
		File.open(self.class.path(@username), 'w') { |f| f.write(encode) }
		self
	rescue Errno::EACCES => e
		internal_error("failed to save user #{@username}: #{e.message}")
	end

	def delete
		File.delete(self.class.path(@username))
	rescue Errno::ENOENT => e
		invalid_argument(:username, "no such user #{@username}: #{e.message}")
	rescue Errno::EACCES => e
		internal_error("failed to delete user #{@username}: #{e.message}")
	end

	def to_json(*args)
		{
			username: @username.to_s,
			last_modified: @last_modified.nil? ? nil : @last_modified.iso8601,
			last_login: @last_login.nil? ? nil : @last_login.iso8601,
		}.to_json(args)
	end

	def <=>(other)
		self.username <=> other.username && self.password <=> other.password
	end

	def encode
		JSON.generate({
			username: @username.encode,
			password: @password.encode,
			last_modified: @last_modified.nil? ? nil : @last_modified.iso8601,
			last_login: @last_login.nil? ? nil : @last_login.iso8601
		})
	end

	def touch
		@last_modified = self.class.now
	end

	def to_s
		@username.to_s
	end

	class << self
		def create(username, password)
			self.new(Username.create(username), Password.create(password), now, nil)
		end

		def decode(encoded)
			user = JSON.parse(encoded, :symbolize_names => true)
			self.new(
				Username.decode(user[:username]),
				Password.decode(user[:password]),
				user[:last_modified].nil? ? nil : Time.parse(user[:last_modified]),
				user[:last_login].nil? ? nil : Time.parse(user[:last_login])
			)
		end

		def from_json(json)
			decode(json)
		end

		def from_path(path)
			json = File.open(path, 'r') { |f| f.read }
			from_json(json)
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

		def now
			Time.now.utc
		end
	end

	private

	def initialize(username, password, last_modified, last_login)
		@username = username
		@password = password
		@last_modified = last_modified
		@last_login = last_login
	end
end
