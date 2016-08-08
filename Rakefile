require 'rake/clean'

TARGET_USER = "pi"
TARGET_IP = "192.168.2.103"
TARGET = "#{TARGET_USER}@#{TARGET_IP}"

WEB_UI = 'web_ui'
BIN = 'bin'
CONF = 'conf'
SERVER = 'server'
DIST = 'dist'
DOCS = 'docs'
LOGS = 'logs'

SOURCES = FileList[ File.join(WEB_UI, '**', '*'), File.join(BIN, '**', '*'), File.join(CONF, '**', '*.{sh,png}'), File.join(SERVER, '**', '*'), File.join(DOCS, '**', '*'), File.join(LOGS, '**', '*') ]

PACKAGE = File.join(DIST, 'package.tar')

task :default => [ DIST, DOCS, LOGS, :deploy ]

CLEAN.include(DIST)
CLOBBER.include(LOGS)

directory DIST
directory DOCS
directory LOGS

def ssh(cmd)
	sh "ssh #{TARGET} #{cmd}"
end

task :prep do
	ssh "sudo apt-get install -y ntpdate"
	ssh "sudo ntpdate -u pool.ntp.org"

	ssh "sudo apt-get install -y matchbox-window-manager"

	ssh "wget http://steinerdatenbank.de/software/kweb-1.6.9.tar.gz"
	ssh "tar -xzf kweb-1.6.9.tar.gz"
	ssh "cd kweb-1.6.9"
	ssh "./debinstall"
	ssh "rm -r kweb-1.6.9*"
end

task :deploy => :package do
	ssh "mkdir -vp ~/solo"
	sh "scp #{PACKAGE} #{TARGET}:~/solo/#{File.basename(PACKAGE)}"
	ssh "tar -C ~/solo --overwrite -xzvf ~/solo/#{File.basename(PACKAGE)}"
	ssh "rm -v ~/solo/#{File.basename(PACKAGE)}"
end

task :package => PACKAGE

file PACKAGE => SOURCES do
	sh "tar -cvzf #{PACKAGE} #{SOURCES.map { |fn| "\"#{fn}\"" }.join(' ')}"
end

task :reload do
	ssh "sudo killall kweb"
end

task :reboot do
	ssh "sudo shutdown -r now"
end

task :shutdown do
	ssh "sudo shutdown -h now"
end
