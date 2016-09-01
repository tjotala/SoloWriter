require 'errors'

class RemovableVolume < Volume
	def mount
		Platform::run("sudo mkdir -p #{base_path}")
		Platform::run("sudo chown -R pi:pi #{base_path}")
		Platform::run("sudo mount -o uid=pi,gid=pi,rw,noatime,nodiratime,noexec,sync,dirsync,flush UUID=#{@id} #{base_path}")
		update(self.class.get(@id))
	end

	def unmount
		Platform::run("sudo umount UUID=#{@id}")
		Platform::run("sudo rmdir #{base_path}")
		update(self.class.get(@id))
	end

	def base_path
		"/media/usb"
	end

	class << self
		def parse(vol)
			path = vol[/MOUNTPOINT="([^"]*)"/, 1]
			{
				id: vol[/UUID="([^"]+)"/, 1],
				interface: get_interface(path),
				name: vol[/NAME="([^"]*)"/, 1],
				label: vol[/LABEL="([^"]+)"/, 1],
				fstype: vol[/FSTYPE="([^"]+)"/, 1],
				path: path,
				total_space: vol[/SIZE="([^"]+)"/, 1].to_i,
				available_space: (path.nil? or path.empty?) ? 0 : get_available_space(path),
			}
		end

		def list
			Platform::run("sudo lsblk --nodeps --output NAME,MOUNTPOINT,LABEL,UUID,SIZE,TYPE,FSTYPE --bytes --paths --pairs `readlink -e /dev/disk/by-id/usb*` | grep part", true).each_line.map do |vol|
				self.new(parse(vol))
			end
		end

		def get(id)
			parse(Platform::run("sudo lsblk --nodeps --output NAME,MOUNTPOINT,LABEL,UUID,SIZE,TYPE,FSTYPE --bytes --paths --pairs `readlink -e /dev/disk/by-uuid/#{id}`", true))
		end

		def get_interface(path)
			'usb'
		end

		def get_file_system(path)
			%x[stat -f -c %T #{path}]
		end

		def get_total_space(path)
			%x[df --output=size -B1 #{path}].split("\n")[1].to_i
		end

		def get_available_space(path)
			%x[df --output=avail -B1 #{path}].split("\n")[1].to_i
		end
	end
end
