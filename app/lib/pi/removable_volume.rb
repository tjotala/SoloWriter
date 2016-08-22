require 'errors'

class RemovableVolume < Volume
	def mount
		self.class.run("sudo mkdir -p /media/usb")
		self.class.run("sudo chown -R pi:pi /media/usb")
		self.class.run("sudo mount -o uid=pi,gid=pi,rw,noatime,nodiratime,noexec,sync,dirsync,flush UUID=#{@id} /media/usb")
		true
	end

	def unmount
		self.class.run("sudo umount UUID=#{@id}")
		self.class.run("sudo rmdir /media/usb")
		true
	end

	private

	class << self
		def run(cmd)
			conflicted_resource(caller[0]) unless system(cmd)
		end

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
			%x[sudo lsblk --nodeps --output NAME,MOUNTPOINT,LABEL,UUID,SIZE,TYPE,FSTYPE --bytes --paths --pairs `readlink -f /dev/disk/by-id/usb*` | grep part].split("\n").map do |vol|
				self.new(parse(vol))
			end
		end

		def get(id)
			parse(%x[sudo lsblk --nodeps --output NAME,MOUNTPOINT,LABEL,UUID,SIZE,TYPE,FSTYPE --bytes --paths --pairs `readlink -f /dev/disk/by-uuid/#{id}`].chomp.strip)
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
