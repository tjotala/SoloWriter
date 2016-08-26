require 'promise'

require 'errors'
require 'volume'

class Volumes
	def list
		[ LocalVolume.new ] + RemovableVolume.list + CloudVolume.list
	end

	def local?(id)
		id.to_s == LocalVolume::ID
	end

	def from_id(id)
		vol = list.find { |vol| vol.id == id }
		vol or no_such_resource("unknown volume #{id}")
	end

	def mount(volume)
		volume.mount
	rescue ConflictedResourceError
		conflicted_resource("failed to mount volume #{volume.id}")
	end

	def unmount(volume)
		volume.unmount
	rescue ConflictedResourceError
		conflicted_resource("failed to unmount volume #{volume.id}")
	end
end
