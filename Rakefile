require 'rake/clean'

TARGET_USER = "pi"
TARGET_IP = "192.168.2.103"
TARGET = "#{TARGET_USER}@#{TARGET_IP}"

WEB_UI = 'web_ui'
BIN = 'bin'
SERVER = 'server'
DIST = 'dist'
DOCS = 'docs'
LOGS = 'logs'

SOURCES = FileList[ File.join(WEB_UI, '**', '*'), File.join(BIN, '**', '*'), File.join(SERVER, '**', '*'), File.join(DOCS, '**', '*'), File.join(LOGS, '**', '*') ]

PACKAGE = File.join(DIST, 'package.tar')

task :default => [ :prep, :deploy ]

CLEAN.include(DIST)
CLOBBER.include(LOGS)

task :prep => [ DIST, DOCS, LOGS ]

directory DIST
directory DOCS
directory LOGS

task :deploy => :package do
	sh "ssh #{TARGET} mkdir -p ~/solo"
	sh "scp #{PACKAGE} #{TARGET}:~/solo/#{File.basename(PACKAGE)}"
	sh "ssh #{TARGET} tar -C ~/solo --overwrite -xzvf ~/solo/#{File.basename(PACKAGE)}"
	sh "ssh #{TARGET} rm ~/solo/#{File.basename(PACKAGE)}"
end

task :package => PACKAGE

file PACKAGE => SOURCES do
	sh "tar -cvzf #{PACKAGE} #{SOURCES.join(' ')}"
end

task :reload do
	sh "ssh #{TARGET} sudo killall kweb"
end

task :shutdown do
	sh "ssh #{TARGET} sudo shutdown -h now"
end
