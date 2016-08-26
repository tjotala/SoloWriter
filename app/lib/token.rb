require 'openssl'
require 'base64'
require 'json'
require 'time'
require 'zlib'

require 'errors'

class Token
	include Comparable
	attr_reader :id
	attr_reader :created
	attr_reader :expires

	# token settings
	LIFETIME = (14 * 24 * 60 * 60).freeze
	SIGNING_KEY_LENGTH = 2048.freeze

	@@digest = OpenSSL::Digest::SHA256.new
	@@signing_key = OpenSSL::PKey::RSA.new(SIGNING_KEY_LENGTH)

	def expired?
		Time.now > @expires
	end

	def encode
		json_token = JSON.generate({ id: @id, created: @created.iso8601, expires: @expires.iso8601 })
		signature = Base64::urlsafe_encode64(@@signing_key.sign(@@digest, json_token))
		json_envelope = JSON.generate({ signature: signature, token: json_token })
		compressed = Zlib::Deflate.deflate(json_envelope)
		Base64::urlsafe_encode64(compressed)
	end

	def <=>(other)
		self.id <=> other.id && self.created <=> other.created && self.expires <=> other.expires
	end

	class << self
		def create(id)
			self.new(id, nil, nil)
		end

		def decode(encoded)
			decoded = Base64::urlsafe_decode64(encoded)
			decompressed = Zlib::Inflate.inflate(decoded)
			envelope = JSON.parse(decompressed, :symbolize_names => true)
			invalid_token unless @@signing_key.verify(@@digest, Base64::urlsafe_decode64(envelope[:signature]), envelope[:token])
			token = JSON.parse(envelope[:token], :symbolize_names => true)
			self.new(token[:id], Time.parse(token[:created]), Time.parse(token[:expires]))
		rescue ArgumentError
			invalid_token
		rescue Zlib::DataError
			invalid_token
		end
	end

	private

	def initialize(id, created, expires)
		@id = id
		@created = (created || Time.now).utc.round(0)
		@expires = (expires || (@created + LIFETIME)).utc.round(0)
	end
end
