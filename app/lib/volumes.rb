require 'promise'

require 'volume'

class Volumes
	def list
		[ LocalVolume.new ] + RemovableVolume.list + CloudVolume.list
	end

	def local?(id)
		id.to_s == LocalVolume::ID
	end

	def to_json(*args)
		list.to_json(args)
	end

	def by_id(id)
		vol = list.find { |vol| vol.id == id }
		vol or raise "unknown volume #{id}"
	end

	def mount(volume)
		return list if volume.mount
		raise "failed to mount volume #{volume.id}"
	end

	def unmount(volume)
		return list if volume.unmount
		raise "failed to unmount volume #{volume.id}"
	end
end
