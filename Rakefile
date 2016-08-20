require 'rake/clean'
begin
  require 'rspec/core/rake_task'
  RSpec::Core::RakeTask.new(:spec)
rescue LoadError
end

TARGET_USER = "pi"
TARGET_IP = "192.168.2.103"
TARGET = "#{TARGET_USER}@#{TARGET_IP}"

PUBLIC = 'public'
BIN = 'bin'
CONF = 'conf'
APP = 'app'
DIST = 'dist'
DOCS = 'docs'
LOGS = 'logs'
USERS = 'users'

SOURCES = FileList[]
SOURCES.include(File.join(PUBLIC, '**', '*'))
SOURCES.include(File.join(BIN, '**', '*'))
SOURCES.include(File.join(CONF, '**', '*.{sh,png}'))
SOURCES.include(File.join(APP, '**', '*'))
SOURCES.include(File.join(DOCS, '**', '*')).exclude(/autosave$/)
SOURCES.include(File.join(LOGS, '**', '*'))
SOURCES.include(File.join(USERS, '**', '*'))

PACKAGE = File.join(DIST, 'package.tar')

task :default => [ DIST, DOCS, LOGS, USERS, :deploy ]

CLEAN.include(DIST)
CLOBBER.include(LOGS)

directory DIST
directory DOCS
directory LOGS
directory USERS

def ssh(cmd)
	sh "ssh #{TARGET} #{cmd}"
end

desc "Prepare the target system"
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

desc "Deploy package"
task :deploy => :package do
	ssh "mkdir -p ~/solo"
	sh "scp #{PACKAGE} #{TARGET}:~/solo/#{File.basename(PACKAGE)}"
	ssh "tar -C ~/solo --overwrite -xzvf ~/solo/#{File.basename(PACKAGE)}"
	ssh "rm -v ~/solo/#{File.basename(PACKAGE)}"
end

desc "Assemble deployment package"
task :package => PACKAGE

file PACKAGE => SOURCES do
	sh "tar -cvzf #{PACKAGE} #{SOURCES.map { |fn| "\"#{fn}\"" }.join(' ')}"
end

desc "Wipe the target system"
task :wipe do
	ssh "sudo rm -rv ~/solo"
end

desc "Reload the browser on the target system"
task :reload do
	ssh "sudo killall kweb"
end

desc "Reboot the target system"
task :reboot do
	ssh "sudo shutdown -r now"
end

desc "Shutdown the target system"
task :shutdown do
	ssh "sudo shutdown -h now"
end
