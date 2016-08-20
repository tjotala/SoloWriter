require 'openssl'
require 'base64'
require 'json'
require 'zlib'
require_relative 'errors'

class Password
	include Comparable
	attr_reader :password
	attr_reader :salt

	# password settings
	PATTERN = /^.{3,}$/.freeze # at least three characters
	SALT_LENGTH = 32.freeze
	KEY_ITERATIONS = 10000.freeze

	@@digest = OpenSSL::Digest::SHA256.new

	def encode
		json_password = JSON.generate({ password: Base64::urlsafe_encode64(@password), salt: Base64::urlsafe_encode64(@salt) })
		compressed = Zlib::Deflate.deflate(json_password)
		Base64::urlsafe_encode64(compressed)
	end

	def match?(plain_password)
		@password == self.class.hash(plain_password, @salt)
	end

	def <=>(other)
		self.password <=> other.password && self.salt <=> other.salt
	end

	class << self
		def create(password)
			missing_argument(:password) if password.nil?
			invalid_argument(:password, "does not meet requirements") unless password =~ PATTERN
			salt = OpenSSL::Random.random_bytes(SALT_LENGTH)
			self.new(hash(password, salt), salt)
		end

		def hash(password, salt)
			OpenSSL::PKCS5.pbkdf2_hmac(password, salt, KEY_ITERATIONS, @@digest.digest_length, @@digest)
		end

		def decode(encoded)
			decoded = Base64::urlsafe_decode64(encoded)
			decompressed = Zlib::Inflate.inflate(decoded)
			password = JSON.parse(decompressed, :symbolize_names => true)
			self.new(Base64::urlsafe_decode64(password[:password]), Base64::urlsafe_decode64(password[:salt]))
		rescue ArgumentError
			invalid_argument(:password, "corrupted")
		rescue Zlib::DataError
			invalid_argument(:password, "corrupted")
		end
	end

	private

	def initialize(password, salt)
		@password = password
		@salt = salt
	end
end
