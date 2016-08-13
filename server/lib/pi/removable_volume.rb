class RemovableVolume < Volume
	def initialize(vol)
		super({
			id: vol[/UUID="([^"]+)"/, 1],
			interface: promise { self.class::get_interface(@path) },
			name: vol[/NAME="([^"]*)"/, 1],
			label: vol[/LABEL="([^"]+)"/, 1],
			fstype: vol[/FSTYPE="([^"]+)"/, 1],
			path: vol[/MOUNTPOINT="([^"]*)"/, 1],
			total_space: vol[/SIZE="([^"]+)"/, 1].to_i,
			available_space: promise { mounted? ? self.class::get_available_space(@path) : 0 },
		})
	end

	def mount
		%x[sudo mkdir -p /media/usb]
		%x[sudo chown -R pi:pi /media/usb]
		%x[sudo mount -o uid=pi -o gid=pi UUID=#{@id} /media/usb]
		true
	end

	def unmount
		%x[sudo umount UUID=#{@id}]
		%x[sudo rmdir /media/usb]
		true
	end

	class << self
		def list
			%x[sudo lsblk --nodeps --output NAME,MOUNTPOINT,LABEL,UUID,SIZE,TYPE,FSTYPE --bytes --paths --pairs `readlink -f /dev/disk/by-id/usb*` | grep part].split("\n").map do |vol|
				self.new(vol)
			end
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
