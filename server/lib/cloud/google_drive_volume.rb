class GoogleDriveVolume < CloudVolume
	def initialize
		super({
			id: 'google',
			name: 'Google Drive'
		})
	end
end
