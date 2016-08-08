#!/usr/bin/ruby
require 'sinatra/base'
require 'sinatra/json'
require_relative File.join('lib', 'server')

SoloServer.start! do
	if SoloServer.settings.kiosk
		SoloServer.set :browser_pid, spawn("kweb3 -KJYHPU http://localhost:#{SoloServer.settings.port}")
	end
end
