class Volumes
	def self.list
		%x[ls /dev/disk/by-label].split("\n").reject { |vol| vol == 'boot' }.sort
	end
end
