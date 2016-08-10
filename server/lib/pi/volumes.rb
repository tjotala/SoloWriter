class Volumes
	def self.list
		%x[sudo lsblk --output NAME,MOUNTPOINT,LABEL,UUID,SIZE,TYPE,FSTYPE --bytes --paths --pairs].split("\n").grep(/TYPE="part"/).map do |vol|
			{
				:uuid => vol[/UUID="([^"]+)"/, 1],
				:type => vol[/FSTYPE="([^"]+)"/, 1],
				:name => vol[/NAME="([^"]*)"/, 1],
				:path => vol[/MOUNTPOINT="([^"]*)"/, 1],
				:label => vol[/LABEL="([^"]+)"/, 1],
				:total_space => vol[/SIZE="([^"]+)"/, 1].to_i,
			}
		end.reject { |vol| vol[:path] == '/boot' }.map do |vol|
			vol[:actions] = { :mount => false, :unmount => false }
			case vol[:path]
			when nil, ''
				vol[:actions][:mount] = true
			when '/'
				vol[:label] = 'SoloWriter'
				vol[:available_space] = available_space(vol[:path])
			else
				vol[:actions][:unmount] = true
				vol[:available_space] = available_space(vol[:path])
			end
			vol
		end
	end

	def self.available_space(path)
		%x[df --output=avail -B1 #{path}].split("\n")[1].to_i
	end
end
