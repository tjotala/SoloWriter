require 'uri'

require 'errors'

class Slide
	attr_reader :set, :name

	def initialize(set, name)
		@set = set
		@name = name
	end

	def to_json(*args)
		{
			name: @name,
			image: url,
		}.to_json(args)
	end

	def exist?
		File.exist?(path)
	end

	def type
		case @name
		when /\.jpg$/, /\.jpeg$/
			:jpeg
		when /\.png$/
			:png
		when /\.gif$/
			:gif
		else
			:octet_stream
		end
	end

	def url
		"#{@set.url}/images/#{URI.encode(@name)}"
	end

	def path
		File.join(@set.path, @name)
	end
end

class SlideSet
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
			images: "#{url}/images",
			license: "#{url}/LICENSE",
		}.to_json(args)
	end

	def images
		Dir.glob(File.join(path, '*.{jpg,jpeg,gif,png}'), File::FNM_CASEFOLD).map { |file| Slide.new(self, File.basename(file)) }
	end

	def count
		images.length
	end

	def image(filename)
		Slide.new(self, filename)
	end

	def exist?(filename)
		image(filename).exist?
	end

	def url
		"/api/volumes/#{@volume.id}/slides/#{URI.encode(@set)}"
	end

	def path
		File.join(@volume.path, 'slides', @set)
	end
end

class SlideSetList
	attr_reader :sets

	def to_json(*args)
		@sets.to_json(args)
	end

	def count
		@sets.length
	end

	def images
		@sets.map { |set| set.images }.flatten
	end

	def image(filename)
		set = @sets.find { |set| set.exist?(filename) }
		no_such_resource(filename) if set.nil?
		set.image(filename)
	end

	def [](set_id)
		subset = @sets.select { |set| set.set == set_id }
		no_such_resource(set_id) if subset.empty?
		self.class.new(subset)
	end

	class << self
		def create(*volumes)
			sets = volumes.map do |vol|
				Dir.glob(File.join(vol.path, 'slides', '*'), File::FNM_CASEFOLD).map { |dir| SlideSet.new(vol, File.basename(dir)) }
			end.flatten
			SlideSetList.new(sets)
		end
	end

	private

	def initialize(sets)
		@sets = sets
	end
end
