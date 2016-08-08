#!/usr/bin/ruby
require 'sinatra/base'
require 'json'

class Document
	attr_reader :full_path, :base_path

	def self.relative(base_name, base_path)
		Document.new(File.join(base_path, base_name), base_path)
	end

	def self.absolute(full_path, base_path)
		Document.new(full_path, base_path)
	end

	def relative_path
		@full_path.gsub(/^#{@base_path}\//, '')
	end

	def write(content)
		File.open(@full_path, 'w') { |f| f.write(content) }
	end

	def remove
		File.unlink(@full_path)
	end

	def to_json(x = nil)
		stat = File.stat(@full_path)
		{ :name => relative_path, :size => stat.size, :modified => stat.mtime.iso8601 }.to_json(x)
	end

	private

	def initialize(full_path, base_path)
		@full_path = full_path
		@base_path = base_path
	end
end

class Documents
	def initialize(base_path)
		@base_path = base_path
	end

	def list
		Dir[File.join(@base_path, '**')].map { |path| Document.absolute(path, @base_path) }
	end

	def to_json
		list.to_json
	end
end

class SoloServer < Sinatra::Base
	configure do
		set :public_folder, File.expand_path(File.join(File.dirname(__FILE__), '..', 'web_ui'))
		enable :static
		enable :logging
		set :doc_folder, File.expand_path(File.join(File.dirname(__FILE__), '..', 'docs'))
		set :port, 8080
		set :kiosk, (RUBY_PLATFORM == "arm-linux-gnueabihf")
	end

	get '/' do
		send_file(File.join(settings.public_folder, 'index.html'))
	end

	get '/api/files/?' do
		status 200
		content_type :json
		Documents.new(settings.doc_folder).to_json
	end

	get '/api/files/:file' do
		send_file(Document.relative(params['file'], settings.doc_folder).full_path, :type => :text, :status => 200)
	end

	put '/api/files/:file' do
		Document.relative(params['file'], settings.doc_folder).write(request.body.read)
		status 204
	end

	delete '/api/files/:file' do
		Document.relative(params['file'], settings.doc_folder).remove
		status 204
	end

	get '/api/quit' do
		if settings.kiosk
			Process.kill('TERM', settings.browser_pid)
		end
		Process.kill('TERM', Process.pid)
		status 204
	end

	get '/api/shutdown' do
		exec("sudo shutdown -h now")
		status 204
	end
end

SoloServer.start! do
	if SoloServer.settings.kiosk
		SoloServer.set :browser_pid, spawn("kweb3 -KJYHPU http://localhost:#{SoloServer.settings.port}")
	end
end
