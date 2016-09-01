require 'uri'
require 'errors'

class Music
	attr_reader :set, :name

	def initialize(set, name)
		@set = set
		@name = name
	end

	def to_json(*args)
		{
			name: @name,
			song: url,
		}.to_json(args)
	end

	def exist?
		File.exist?(path)
	end

	def type
		case @name
		when /\.mp3$/
			:mp3
		when /\.m4a$/
			:m4a
		when /\.ogg/
			:ogg
		else
			:octet_stream
		end
	end

	def url
		"#{@set.url}/songs/#{URI.encode(@name)}"
	end

	def path
		File.join(@set.path, @name)
	end

	def play
		self.class.stop
		pid = spawn("omxplayer --no-osd --no-keys \"#{path}\"")
		Process.detach(pid)
	end

	class << self
		def stop
			%x[killall omxplayer.bin]
		end
	end
end

class MusicSet
	attr_reader :volume
	attr_reader :set

	def initialize(volume, set)
		@volume = volume
		@set = set
	end

	def to_json(*args)
		{
			id: @set,
			name: @set.capitalize,
			url: url,
			count: count,
			songs: "#{url}/songs",
			license: "#{url}/LICENSE",
		}.to_json(args)
	end

	def songs
		Dir.glob(File.join(path, '*.{mp3,m4a,ogg}'), File::FNM_CASEFOLD).map { |file| Music.new(self, File.basename(file)) }
	end

	def count
		songs.length
	end

	def song(filename)
		Music.new(self, filename)
	end

	def exist?(filename)
		song(filename).exist?
	end

	def url
		"/api/volumes/#{@volume.id}/music/#{URI.encode(@set)}"
	end

	def path
		File.join(@volume.path, 'music', @set)
	end
end

class MusicSetList
	attr_reader :sets

	def to_json(*args)
		@sets.to_json(args)
	end

	def count
		@sets.length
	end

	def songs
		@sets.map { |set| set.songs }.flatten
	end

	def song(filename)
		set = @sets.find { |set| set.exist?(filename) }
		no_such_resource(filename) if set.nil?
		set.song(filename)
	end

	def [](set_id)
		subset = @sets.select { |set| set.set == set_id }
		no_such_resource(set_id) if subset.empty?
		self.class.new(subset)
	end

	class << self
		def create(*volumes)
			sets = volumes.map do |vol|
				Dir.glob(File.join(vol.path, 'music', '*'), File::FNM_CASEFOLD).map { |dir| MusicSet.new(vol, File.basename(dir)) }
			end.flatten
			MusicSetList.new(sets)
		end
	end

	private

	def initialize(sets)
		@sets = sets
	end
end
