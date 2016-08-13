#!/usr/bin/ruby
require 'sinatra/base'
require 'sinatra/json'
require_relative 'platform'
require File.join(Platform::LIB_PATH, 'server')
require File.join(Platform::LIB_PATH, 'browser')

SoloServer.start! do
	SoloServer.set :browser, Browser.new("http://localhost:#{SoloServer.settings.port}").launch
end
