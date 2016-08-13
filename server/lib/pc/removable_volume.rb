require 'win32ole'

class RemovableVolume < Volume
	def initialize(drive)
		super({
			id: drive.SerialNumber.to_s,
			interface: promise { self.class::get_interface(@path) },
			name: drive.Path.to_s,
			label: drive.VolumeName.to_s,
			fstype: drive.FileSystem.to_s.downcase,
			path: drive.Path.to_s,
			total_space: drive.TotalSize.to_i,
			available_space: promise { self.class::get_available_space(@path) },
		})
	end

	class << self
		def list
			volumes = Array.new
			fso = WIN32OLE.new('Scripting.FileSystemObject')
			fso.Drives.each do |drive| # apparently map is not supported by Win32 collections?!?
				begin
					next unless drive.IsReady
					next unless drive.DriveType == 1 # only accept removable drives
					volumes << self.new(drive)
				rescue WIN32OLERuntimeError
					# ignore drives that we can't fully resolve?!?
				end
			end
			volumes
		end

		def get_interface(path)
			'usb'
		end

		def get_file_system(path)
			fso = WIN32OLE.new('Scripting.FileSystemObject')
			fso.GetDrive(fso.GetDriveName(path)).FileSystem.to_s.downcase
		end

		def get_total_space(path)
			fso = WIN32OLE.new('Scripting.FileSystemObject')
			fso.GetDrive(fso.GetDriveName(path)).TotalSize.to_i
		end

		def get_available_space(path)
			fso = WIN32OLE.new('Scripting.FileSystemObject')
			fso.GetDrive(fso.GetDriveName(path)).AvailableSpace.to_i
		end
	end
end
