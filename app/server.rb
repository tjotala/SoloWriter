#!/usr/bin/ruby
require 'sinatra/base'
require 'sinatra/json'

require File.join(File.dirname(File.expand_path(__FILE__)), 'platform')
require 'server'
require 'browser'

SoloServer.start! do
	SoloServer.set :browser, Browser.new("http://localhost:#{SoloServer.settings.port}").launch
end
