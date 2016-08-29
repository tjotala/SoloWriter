require 'rake/clean'
begin
  require 'rspec/core/rake_task'
  RSpec::Core::RakeTask.new(:spec)
rescue LoadError
end

TARGET_USER = "pi"
TARGET_IP = ENV["TARGET_IP"] || "192.168.2.103"
TARGET = "#{TARGET_USER}@#{TARGET_IP}"

PUBLIC = 'public'
BIN = 'bin'
CONF = 'conf'
APP = 'app'
SPEC = 'spec'
DIST = 'dist'
DOCS = 'docs'
LOGS = 'logs'
USERS = 'users'

SOURCES = FileList[]
SOURCES.include(File.join(PUBLIC, '**', '*'))
SOURCES.include(File.join(BIN, '**', '*'))
SOURCES.include(File.join(CONF, '**', '*.{sh,png}'))
SOURCES.include(File.join(APP, '**', '*'), 'Gemfile', 'Rakefile')
SOURCES.include(File.join(SPEC, '**', '*'))
SOURCES.include(File.join(DOCS, '**', '*')).exclude(/autosave$/).exclude(/\h{8}-\h{4}-\h{4}-\h{4}-\h{12}/)
#SOURCES.include(File.join(LOGS, '**', '*'))
#SOURCES.include(File.join(USERS, '**', '*'))

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

class String
	def quoted
		"\"#{self}\""
	end
end

class Array
	def quoted
		map { |s| s.to_s.quoted }
	end
end

desc "Deploy package"
task :deploy => :package do
	ssh "mkdir -p ~/solo"
	sh "scp #{PACKAGE} #{TARGET}:/tmp/#{File.basename(PACKAGE)}"
	ssh "tar -C ~/solo --overwrite -xzvf /tmp/#{File.basename(PACKAGE)}"
	ssh "rm /tmp/#{File.basename(PACKAGE)}"
	ssh "cd ~/solo && bundle install --jobs `nproc`".quoted
end

desc "Create deployment package"
task :package => [ DIST, PACKAGE ]

file PACKAGE => SOURCES do
	sh "tar -cvzf #{PACKAGE} #{SOURCES.to_a.reject { |f| File.directory?(f) }.quoted.join(' ')}"
end

namespace :target do

	desc "Test the target system"
	task :test do
		ssh "cd ~/solo && rake spec".quoted
	end

	desc "Wipe the target system"
	task :wipe do
		ssh "rm -r ~/solo"
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
end # namespace :target

namespace :prep do

	desc "Prepare the target Raspberry Pi from Jessie Lite"
	task :lite => [ :ssh, :cleanup, :update, :network, :wpa_us, :ntp, :ntfs, :ruby, :xwindows, :fonts, :wm, :kweb, :app ]

	desc "Install your SSH key"
	task :ssh do
		sh "ssh-copy-id pi@#{TARGET_IP}"
	end

	desc "Cleanup unwanted junk"
	task :cleanup do
		ssh "sudo systemctl disable ModemManager.service"
		ssh "sudo systemctl disable triggerhappy.service"
	end

	desc "Update the system image"
	task :update do
		ssh "sudo apt-get -y update"
		ssh "sudo apt-get -y upgrade"
	end

	desc "Configure the network interfaces for DHCP"
	task :network do
		ssh "sudo " + "sed -i -e 's/inet manual/inet dhcp/;s/iface eth0 inet dhcp/allow-hotplug eth0\\niface eth0 inet dhcp\\n\\nallow-hotplug eth1\\niface eth1 inet dhcp/' /etc/network/interfaces".quoted
	end

	desc "Configure WiFi for US"
	task :wpa_us do
		ssh "sudo " + "sed -i -e 's/country=GB/country=US/' /etc/wpa_supplicant/wpa_supplicant.conf".quoted
	end

	desc "Install and configure NTP"
	task :ntp do
		ssh "sudo apt-get install -y ntpdate"
		ssh "sudo ntpdate -u pool.ntp.org"
	end

	desc "Install NTFS support"
	task :ntfs do
		ssh "sudo apt-get -y install ntfs-3g"
	end

	desc "Install ruby"
	task :ruby do
		ssh "sudo apt-get -y install ruby rubygems bundler"
	end

	desc "Install minimal X Windows"
	task :xwindows do
		ssh "sudo apt-get -y install xinit"
	end

	desc "Install additional fonts"
	task :fonts do
		ssh "sudo apt-get -y install fonts-dejavu fonts-dejavu-extra fonts-droid fonts-freefont-ttf fonts-opensymbol fonts-roboto fonts-sil-gentium-basic xfonts-100dpi"
	end

	desc "Install minimal window manager"
	task :wm do
		ssh "sudo apt-get -y install unclutter"
		ssh "sudo apt-get -y install matchbox-window-manager"
	end

	desc "Install minimal web browser (kweb)"
	task :kweb do
		ssh "wget -N -P /tmp http://steinerdatenbank.de/software/kweb-1.6.9.tar.gz"
		ssh "tar -C /tmp -xzf /tmp/kweb-1.6.9.tar.gz"
		ssh "cd /tmp/kweb-1.6.9 && sh ./debinstall".quoted
		ssh "rm -r /tmp/kweb-1.6.9*"
	end

	desc "Install minimal web browser (midori)"
	task :midori do
		ssh "sudo apt-get -y install midori"
	end

	desc "Prepare subfolders for the application installation"
	task :app do
		ssh "sudo mkdir -p /var/log/solo"
		ssh "sudo chown pi:pi /var/log/solo"
	end

end # namespace :prep
