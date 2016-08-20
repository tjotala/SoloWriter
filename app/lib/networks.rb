require 'promise'
require_relative 'errors'
require_relative 'network'

class Networks
	def to_json(*args)
		list.to_json(args)
	end

	def list
		not_implemented # overridden by platform-speific version
	end
end

require File.join(Platform::PLATFORM_PATH, 'networks')
