require 'win32ole'

class RemovableVolume < Volume
	class << self
		def parse(drive)
			path = drive.Path.to_s
			{
				id: drive.SerialNumber.to_s,
				interface: get_interface(path),
				name: drive.Path.to_s,
				label: drive.VolumeName.to_s,
				fstype: drive.FileSystem.to_s.downcase,
				path: path,
				total_space: drive.TotalSize.to_i,
				available_space: get_available_space(path),
			}
		end

		def list
			volumes = Array.new
			fso = WIN32OLE.new('Scripting.FileSystemObject')
			fso.Drives.each do |drive| # apparently map is not supported by Win32 collections?!?
				begin
					next unless drive.IsReady
					next unless drive.DriveType == 1 # only accept removable drives
					volumes << self.new(parse(drive))
				rescue WIN32OLERuntimeError
					# ignore drives that we can't fully resolve?!?
				end
			end
			volumes
		end

		def get(id)
			fso = WIN32OLE.new('Scripting.FileSystemObject')
			fso.Drives.each do |drive| # apparently map is not supported by Win32 collections?!?
				begin
					next unless drive.IsReady
					next unless drive.DriveType == 1 # only accept removable drives
					return parse(drive) if id == drive.SerialNumber.to_s
				rescue WIN32OLERuntimeError
					# ignore drives that we can't fully resolve?!?
				end
			end
			nil
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
