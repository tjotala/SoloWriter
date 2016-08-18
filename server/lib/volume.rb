class Volume
	attr_reader :id # required
	attr_reader :interface # required
	attr_reader :name # required
	attr_reader :label
	attr_reader :fstype
	attr_reader :path
	attr_reader :total_space
	attr_reader :available_space

	def initialize(opts = { })
		update(opts)
	end

	def update(opts = { })
		@id = opts[:id] or raise ArgumentError
		@interface = opts[:interface] or raise ArgumentError
		@name = opts[:name] or raise ArgumentError
		@label = opts[:label] || opts[:name]
		@fstype = opts[:fstype]
		@path = opts[:path]
		@total_space = opts[:total_space] || 0
		@available_space = opts[:available_space] || 0
		self
	end

	def to_json(*args)
		{
			id: @id,
			interface: @interface,
			name: @name,
			label: @label,
			path: @path,
			total_space: @total_space,
			available_space: @available_space,
			mounted: mounted?,
			can_mount: mountable?,
			can_unmount: unmountable?,
		}.to_json(args)
	end

	def mounted?
		!(@path.nil? || @path.empty?)
	end

	def mountable?
		respond_to?(:mount) && !mounted?
	end

	def unmountable?
		respond_to?(:unmount) && mounted?
	end
end

require File.join(Platform::LIB_PATH, 'local_volume')
require File.join(Platform::LIB_PATH, 'cloud_volume')
require File.join(Platform::PLATFORM_PATH, 'removable_volume')
