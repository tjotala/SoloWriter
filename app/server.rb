#!/usr/bin/ruby
require 'rubygems'
require 'bundler/setup'
require 'sinatra/base'
require 'sinatra/json'

require File.join(File.dirname(File.expand_path(__FILE__)), 'platform')
require 'server'

SoloServer.start!
