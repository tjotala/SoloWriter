require 'errors'
require 'network'

class Networks
	def to_json(*args)
		list.to_json(args)
	end

	def list
		[ 'fake' ]
	end
end
