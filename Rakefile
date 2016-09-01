require 'rake/clean'
begin
	require 'rspec/core/rake_task'
	RSpec::Core::RakeTask.new(:spec)
rescue LoadError
end

TARGET_USER = "pi"
TARGET_IP = ENV["TARGET_IP"] || "192.168.2.102"
TARGET_DIR = "~/solo"
TARGET = "#{TARGET_USER}@#{TARGET_IP}"

PUBLIC = 'public'
BIN = 'bin'
APP = 'app'
SPEC = 'spec'
DIST = 'dist'
LOCAL = 'local'
USERS = 'users'

SOURCES = FileList[]
SOURCES.include(File.join(PUBLIC, '**', '*'))
SOURCES.include(File.join(BIN, '**', '*'))
SOURCES.include(File.join(APP, '**', '*'), 'Gemfile', 'Rakefile')
SOURCES.include(File.join(SPEC, '**', '*'))
SOURCES.include(File.join(LOCAL, '**', '*')).exclude(/autosave$/).exclude(/\h{8}-\h{4}-\h{4}-\h{4}-\h{12}/)

PACKAGE_FILE = File.join(DIST, 'solo.tar.gz')
PACKAGE_SIGN = "#{PACKAGE_FILE}.signature"

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

task :default => [ DIST, LOCAL, USERS, :deploy ]

CLEAN.include(DIST)

directory DIST
directory LOCAL
directory USERS

desc "Deploy package"
task :deploy => :package do
	ssh "mkdir -p #{TARGET_DIR}/{users,docs}"
	sh "scp #{PACKAGE_FILE} #{PACKAGE_SIGN} #{TARGET}:/tmp/"
	ssh "tar -C #{TARGET_DIR} --overwrite -xzvf /tmp/#{File.basename(PACKAGE_FILE)}"
	ssh "rm /tmp/#{File.basename(PACKAGE_FILE)}"
	ssh "cd #{TARGET_DIR} && bundle install --jobs `nproc`".quoted
end

desc "Create the deployment files"
task :package => [ PACKAGE_FILE, PACKAGE_SIGN ]

desc "Sign the deployment package"
file PACKAGE_SIGN => PACKAGE_FILE do
	sh "openssl dgst -sha256 -sign #{ENV['HOME']}/.ssh/id_rsa -out #{PACKAGE_SIGN} #{PACKAGE_FILE}"
end

desc "Create the deployment package"
file PACKAGE_FILE => SOURCES do
	sh "tar -cvzf #{PACKAGE_FILE} #{SOURCES.to_a.reject { |f| File.directory?(f) }.quoted.join(' ')}"
end

namespace :target do

	desc "Test the target system"
	task :test do
		ssh "cd #{TARGET_DIR} && rake spec".quoted
	end

	desc "Take a screenshot and copy back"
	task :screenshot do
		shots = Dir['screenshot*.png']
		shot = (shots.sort.pop || 'screenshot00.png').pathmap('%n').succ + '.png'
		ssh "DISPLAY=:0 scrot /tmp/#{shot}"
		sh "scp #{TARGET}:/tmp/#{shot} ./#{shot}"
		ssh "rm /tmp/#{shot}"
	end

	desc "Wipe the target system"
	task :wipe do
		ssh "rm -r #{TARGET_DIR}"
	end

	desc "Relaunch the app on the target system"
	task :reload do
		ssh "sudo killall midori || true"
		ssh "sudo killall ruby || true"
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
	task :lite => [ :cleanup, :update, :network, :wpa_us, :ntp, :"tz:pacific", :ntfs, :ruby, :xwindows, :fonts, :wm, :midori, :omxplayer, :app_folders, :enable_auto_launch, :boot_screen ]

	desc "Prepare the target Raspberry Pi from Jessie (Full)"
	task :lite => [ :cleanup, :update, :network, :wpa_us, :ntp, :"tz:pacific", :ntfs, :wm, :midori, :omxplayer, :app_folders, :enable_auto_launch, :boot_screen ]

	desc "Disable unneeded features"
	task :cleanup do
		ssh "sudo systemctl disable ModemManager.service"
		ssh "sudo systemctl disable triggerhappy.service"

		# disable remote GPIO
 		ssh "sudo rm -f /etc/systemd/system/pigpiod.service.d/public.conf"
 	end

	desc "Update the system image"
	task :update do
		ssh "sudo apt-get -y update"
		ssh "sudo apt-get -y upgrade"
	end

	desc "Configure the network interfaces"
	task :network do
		# enable DHCP on eth{0,1} and wlan{0,1}
		ssh "sudo " + "sed -i -e 's/inet manual/inet dhcp/;s/iface eth0 inet dhcp/allow-hotplug eth0\\niface eth0 inet dhcp\\n\\nallow-hotplug eth1\\niface eth1 inet dhcp/' /etc/network/interfaces".quoted
		# disable wait for Ethernet on boot
		ssh "sudo rm -f /etc/systemd/system/dhcpcd.service.d/wait.conf"
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

	desc "Install minimal audio/video player (omxplayer)"
	task :omxplayer do
		ssh "sudo apt-get -y install omxplayer"
	end

	desc "Prepare subfolders for the application installation"
	task :app_folders do
		ssh "sudo mkdir -p /var/log/solo"
		ssh "sudo chown #{TARGET_USER}:#{TARGET_USER} /var/log/solo"
	end

	desc "Set up TARGET_USER to auto-launch the app"
	task :enable_auto_launch do
		ssh "echo . #{TARGET_DIR}/bin/run.sh >> ~/.profile".quoted
	end

	desc "Configure boot behavior"
	task :boot_screen do
		ssh "sudo update-initramfs -c -t -k $(uname -r)"
		# tell the bootloader what image to use
		ssh "echo initramfs initrd.img-$(uname -r) | sudo tee -a /boot/config.txt".quoted
		# turn off the rainbox square
		ssh "echo disable_splash=1 | sudo tee -a /boot/config.txt".quoted
		# quiet the boot messages
		ssh "sudo " + "sed -i -e 's/console=tty1/console=tty3 quiet loglevel=3/' /boot/cmdline.txt".quoted
		# re-generate initramfs
		ssh "sudo update-initramfs -u"
	end

	namespace :tz do
		desc "Set timezone to Pacific"
		task :pacific do
			ssh "sudo timedatectl set-timezone America/Los_Angeles"
		end

		desc "Set timezone to Mountain"
		task :central do
			ssh "sudo timedatectl set-timezone America/Denver"
		end

		desc "Set timezone to Central"
		task :central do
			ssh "sudo timedatectl set-timezone America/Chicago"
		end

		desc "Set timezone to Eastern"
		task :central do
			ssh "sudo timedatectl set-timezone America/New_York"
		end
	end

	desc "Install screenshot utility"
	task :screenshot do
		ssh "sudo apt-get -y install scrot"
	end

end # namespace :prep
