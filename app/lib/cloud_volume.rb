require 'errors'
require 'volume'

class CloudVolume < Volume
	INTERFACE = 'network'.freeze
	TYPE = 'cloud'.freeze

	@@volumes = Array.new

	def initialize(opts = { })
		super(opts.merge({
			interface: INTERFACE,
			fstype: TYPE,
		}))
	end

	class << self
		def list
			@@volumes.map { |cls| cls.new }.select { |vol| vol.respond_to?(:mount) || vol.respond_to?(:unmount) }
		end

		def inherited(cls)
			@@volumes << cls
		end
	end
end

Dir[File.join(File.dirname(File.expand_path(__FILE__)), 'cloud', '*')].each { |file| require file }
