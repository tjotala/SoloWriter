class Volumes
	require 'win32ole'

	def self.list
		fs = WIN32OLE.new('Scripting.FileSystemObject')
		volumes = Array.new
		fs.Drives.each do |drive| # apparently map is not supported by Win32 collections?!?
			begin
				next unless drive.IsReady
				next unless [ 1, 2 ].include?(drive.DriveType) # only accept removable or fixed drives
				volumes << {
					:uuid => drive.SerialNumber.to_s,
					:type => drive.FileSystem.to_s,
					:name => drive.DriveLetter.to_s,
					:path => drive.RootFolder.Path.to_s,
					:label => drive.VolumeName.to_s,
					:total_space => drive.TotalSize.to_i,
					:available_space => drive.AvailableSpace.to_i,
					:actions => {
						:mount => false,
						:unmount => false
					},
				}
			rescue WIN32OLERuntimeError
				# ignore drives that we can't fully resolve?!?
			end
		end
		volumes
	end
end
