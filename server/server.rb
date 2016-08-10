#!/usr/bin/ruby
require 'sinatra/base'
require 'sinatra/json'
require_relative 'platform'
Platform::require_lib 'server'
Platform::require_lib 'browser'

SoloServer.start! do
	SoloServer.set :browser, Browser.new("http://localhost:#{SoloServer.settings.port}")
end
