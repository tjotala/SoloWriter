#!/usr/bin/ruby
require 'optparse'
require 'fileutils'
require 'json'

class Options
	attr_reader :mode, :ssid, :psk, :key_mgmt, :input, :output, :backup

	def initialize
		@mode = :list
		@input = '/etc/wpa_supplicant/wpa_supplicant.conf'
		@output = @input.dup
		@backup = true
		self
	end

	def parse!
		modes = [ :add, :del, :list ]
		OptionParser.new do |op|
			op.banner = "#{$0} [options]"

			op.on('-m', '--mode MODE', modes, "Set mode: #{modes.join(', ')}") do |mode|
				@mode = mode
			end

			op.on('--ssid SSID', "Set SSID") do |ssid|
				@ssid = ssid
			end

			op.on('--psk PSK', "Set PSK") do |psk|
				@psk = psk
			end

			op.on('--key-mgmt KEY-MGMT', "Set key management") do |key_mgmt|
				@key_mgmt = key_mgmt
			end

			op.on('-i', '--input FILE', "Set input file (default: #{@input})") do |file|
				@input = (file == '-') ? $stdin : file
			end

			op.on('-o', '--output FILE', "Set output file (default: #{@output})") do |file|
				@output = (file == '-') ? $stdout : file
			end

			op.on('-b', '--[no-]backup', "Make a backup copy of the file before modifying") do |b|
				@backup = b
			end

			op.on_tail('-?', '-h', '--help', "Show this help message") do
				$stderr.puts op.help
				exit 1
			end
		end.parse!

		case @mode
		when :add
			raise "missing argument(s)" if @ssid.nil?
		when :del
			raise "missing argument" if @ssid.nil?
		when :list
			# no-op
		end
		self
	end
end

class Network
	attr_accessor :ssid, :psk, :key_mgmt

	def initialize(ssid = nil, psk = nil, key_mgmt = nil)
		@ssid = ssid
		@psk = psk
		@key_mgmt = key_mgmt
	end

	def incomplete?
		@ssid.nil? or @ssid.empty?
	end

	def to_s
		str = ''
		str << "network={\n"
		str << %Q[\tssid="#{@ssid}"\n]
		str << %Q[\tpsk="#{@psk}"\n]
		str << %Q[\tkey_mgmt=#{@key_mgmt}\n] unless @key_mgmt.nil?
		str << "}\n"
	end

	def to_json(*args)
		{
			ssid: @ssid,
			psk: @psk,
			key_mgmt: @key_mgmt
		}.select { |k, v| v }.to_json(args)
	end
end

class Configuration
	attr_reader :prefix, :networks

	def initialize
		@prefix = [ ]
		@networks = [ ]
		self
	end

	def parse(input)
		net = Network.new
		input.each_line do |line|
			line = line.chomp.strip
			case line
			when /network\s*=\s*{/
				net = Network.new
			when /ssid\s*=\s*"([^"]+)"/
				net.ssid = $1
			when /psk\s*=\s*"([^"]+)"/
				net.psk = $1
			when /key_mgmt\s*=\s*(\S+)/
				net.key_mgmt = $1
			when /\}/
				add(net) unless net.incomplete?
				net = Network.new
			else
				@prefix << line unless line.empty? # eat empty lines
			end
		end
		add(net) unless net.incomplete?
		self
	end

	def add(network)
		remove(network.ssid)
		@networks.push(network)
		self
	end

	def remove(ssid)
		@networks.reject! { |net| net.ssid == ssid }
		self
	end

	def list
		@networks
	end

	def to_s
		(@prefix + @networks).join("\n")
	end

	def to_json(*args)
		@networks.to_json(args)
	end

	class << self
		def backup(input)
			FileUtils.cp(input, "#{input}.backup")
		end

		def load(input)
			if input.respond_to?(:read)
				Configuration.new.parse(input)
			else
				File.open(input, 'r') { |f| Configuration.new.parse(f) }
			end
		end
	end

	def save(output)
		if output.respond_to?(:write)
			output.puts to_s
		else
			File.open(output, 'w') { |f| f.puts to_s }
		end
	end
end

def main
	options = Options.new.parse!

	config = Configuration.load(options.input)

	case options.mode
	when :add
		Configuration.backup(options.input) if options.backup
		config.add(Network.new(options.ssid, options.psk, options.key_mgmt))
		config.save(options.output)
	when :del
		Configuration.backup(options.input) if options.backup
		config.remove(options.ssid)
		config.save(options.output)
	when :list
		puts config.to_json
	end
end

main if $0 == __FILE__
