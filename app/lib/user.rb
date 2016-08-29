require 'openssl'
require 'base64'
require 'json'
require 'securerandom'

require 'errors'
require 'username'
require 'password'
require 'token'

class User
	include Comparable
	attr_reader :id
	attr_reader :username
	attr_reader :password
	attr_reader :modified
	attr_reader :loggedin

	def password?(password)
		@password.match?(password)
	end

	def new_username(username)
		@username = Username.create(username)
		touch
		self
	end

	def new_password(password)
		@password = Password.create(password)
		touch
		self
	end

	def new_token
		@loggedin = self.class.now
		Token.create(@id).encode
	end

	def save
		File.open(path, 'w') { |f| f.write(encode) }
		self
	rescue Errno::EACCES => e
		internal_error("failed to save user #{@username}: #{e.message}")
	end

	def delete
		File.delete(path)
	rescue Errno::ENOENT => e
		invalid_argument(:username, "no such user #{@username}: #{e.message}")
	rescue Errno::EACCES => e
		internal_error("failed to delete user #{@username}: #{e.message}")
	end

	def to_json(*args)
		{
			id: @id.to_s,
			username: @username.to_s,
			modified: @modified.nil? ? nil : @modified.iso8601,
			loggedin: @loggedin.nil? ? nil : @loggedin.iso8601,
		}.select { |k, v| v }.to_json(args)
	end

	def <=>(other)
		self.id <=> other.id && self.username <=> other.username && self.password <=> other.password
	end

	def encode
		JSON.generate({
			id: @id.to_s,
			username: @username.encode,
			password: @password.encode,
			modified: @modified.nil? ? nil : @modified.iso8601,
			loggedin: @loggedin.nil? ? nil : @loggedin.iso8601
		})
	end

	def touch
		@modified = self.class.now
	end

	def path
		self.class.path(@id)
	end

	def to_s
		"#{@id} (#{@username})"
	end

	class << self
		def create(username, password)
			self.new(SecureRandom.uuid, Username.create(username), Password.create(password), now, nil)
		end

		def decode(encoded)
			user = JSON.parse(encoded, :symbolize_names => true)
			self.new(
				user[:id],
				Username.decode(user[:username]),
				Password.decode(user[:password]),
				user[:modified].nil? ? nil : Time.parse(user[:modified]),
				user[:loggedin].nil? ? nil : Time.parse(user[:loggedin])
			)
		rescue JSON::ParserError
			invalid_argument("user record", "corrupted")
		end

		def from_json(json)
			decode(json)
		end

		def from_path(path)
			json = File.open(path, 'r') { |f| f.read }
			from_json(json)
		rescue Errno::ENOENT
			no_such_resource("user: #{path}")
		end

		def from_id(id)
			from_path(path(id))
		end

		def from_token(token)
			from_id(Token.decode(token).id)
		end

		def from_name(username)
			Dir[User.path('*')].each do |p|
				user = from_path(p)
				return user if user.username.to_s == username.to_s
			end
			no_such_resource("user")
		end

		def exist?(username)
			from_name(username)
			true
		rescue NoSuchResourceError => e
			false
		end

		def path(id)
			File.join(Platform::USERS_PATH, id)
		end

		def list
			Dir[User.path('*')].map { |path| self.from_path(path) }
		end

		def now
			Time.now.utc
		end
	end

	private

	def initialize(id, username, password, modified, loggedin)
		@id = id
		@username = username
		@password = password
		@modified = modified
		@loggedin = loggedin
	end
end
