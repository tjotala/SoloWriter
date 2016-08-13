require 'promise'
require_relative 'volume'

class Volumes
	def initialize
		refresh
	end

	def refresh
		@volumes = promise { list }
	end

	def local?(id)
		id.to_s == LocalVolume::ID
	end

	def to_json(*args)
		@volumes.to_json(args)
	end

	def by_id(id)
		vol = @volumes.find { |vol| vol.id == id }
		vol or raise "unknwon volume #{id}"
	end

	def mount(volume)
		return refresh unless volume.mount
		raise "failed to mount volume #{volume.id}"
	end

	def unmount(volume)
		return refresh unless volume.unmount
		raise "failed to unmount volume #{volume.id}"
	end

	def list
		[ LocalVolume.new ] + RemovableVolume.list + NetworkVolume.list
	end
end
