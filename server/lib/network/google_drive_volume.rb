class GoogleDriveVolume < NetworkVolume
	def initialize
		super({
			id: 'google',
			name: 'Google Drive'
		})
	end
end
