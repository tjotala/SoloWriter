require 'rake/clean'
begin
	require 'rspec/core/rake_task'
	RSpec::Core::RakeTask.new(:spec)
rescue LoadError
	$stderr.puts "rspec integration is not available"
end

TARGET_IP = ENV["TARGET_IP"] || "192.168.2.102"

CONF = 'conf'.freeze
DIST = 'dist'.freeze
LOCAL = 'local'.freeze
USERS = 'users'.freeze

PACKAGE_FILE = File.join(DIST, 'solo.tar.gz')
SIGNATURE_FILE = File.join(DIST, 'solo.signature')
WRAPPER_FILE = File.join(DIST, 'solo.package')

SIGNING_SUBJECT = "/C=US/ST=California/L=San Jose/O=Otala Family/OU=Parents/CN=Tapani Otala"
SIGNING_KEY_FILE = File.join(CONF, 'signing.key')
SIGNING_CERT_FILE = File.join(CONF, 'signing.crt')
SIGNING_PUBKEY_FILE = File.join(CONF, 'signing.pub')

SOURCES = FileList[]
SOURCES.include(File.join('public', '**', '*'))
SOURCES.include(File.join('bin', '**', '*'))
SOURCES.include(File.join('app', '**', '*'), 'Gemfile', 'Rakefile')
SOURCES.include(File.join('spec', '**', '*'))
SOURCES.include(File.join(LOCAL, '**', '*')).exclude(/autosave$/).exclude(/\h{8}-\h{4}-\h{4}-\h{4}-\h{12}/)
SOURCES.exclude { |f| File.directory?(f) }


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

class RemoteTarget
	include Rake::FileUtilsExt
	attr_reader :user, :address, :base_path, :temp_path

	def initialize(user, address, base_path, temp_path)
		@user = user
		@address = address
		@base_path = base_path
		@temp_path = temp_path
	end

	def target
		"#{@user}@#{address}"
	end

	def target_path(file)
		"#{target}:#{file.quoted}"
	end

	def cmd(cmdline)
		sh "ssh #{target} #{cmdline}"
	end

	def cp(host_files, target_folder)
		sh "scp #{host_files.to_a.quoted.join(' ')} #{target_path(target_folder)}"
	end
	alias_method :cp_to, :cp

	def cp_from(target_files, host_path)
		sh "scp #{target_files.map { |target_file| target_path(target_file) }} #{host_path.quoted}"
	end
end

class LocalTarget
	include Rake::FileUtilsExt
	attr_reader :base_path, :temp_path

	def initialize(base_path, temp_path)
		@base_path = base_path
		@temp_path = temp_path
	end

	def cmd(cmdline)
		sh cmdline.quoted
	end

	def cp(host_files, target_path)
		cp host_files, target_path
	end
	alias_method :cp_to, :cp

	def cp_from(target_files, host_path)
		cp target_files, host_path
	end
end

LOCAL_TARGET = LocalTarget.new("~/solo", "/tmp").freeze
REMOTE_TARGET = RemoteTarget.new("pi", TARGET_IP, LOCAL_TARGET.base_path, LOCAL_TARGET.temp_path).freeze
TARGET = REMOTE_TARGET

task :default => [ DIST, LOCAL, USERS, :package, :deploy, :install ]

CLEAN.include(DIST)

directory DIST
directory LOCAL
directory USERS

desc "Install an upgrade from a mounted USB storage device"
task :upgrade => FileList["/media/**/#{File.basename(WRAPPER_FILE)}"] do |t|
	t.prerequisites.each do |package_wrapper_file|
		LOCAL_TARGET.cmd "tar -C #{LOCAL_TARGET.temp_path} --overwrite -xzvf #{package_wrapper_file}"
		package_file = File.join(LOCAL_TARGET.temp_path, File.basename(PACKAGE_FILE))
		signature_file = File.join(LOCAL_TARGET.temp_path, File.basename(SIGNATURE_FILE))
		LOCAL_TARGET.cmd "openssl dgst -sha256 -verify #{LOCAL_TARGET.base_path}/#{SIGNING_CERT_FILE} -signature #{signature_file} #{package_file}"
	end
end

desc "Install the deployment package"
task :install, [ :target, :package ] do
	args.with_defaults(:target => REMOTE_TARGET, :package => "#{TARGET.temp_path}/#{File.basename(PACKAGE_FILE)}")
	target = args[:target]
	package = args[:package]
	target.cmd "tar -C #{TARGET.base_path} --overwrite -xzvf #{package}"
	target.cmd "rm #{package}"
	target.cmd "cd #{TARGET.base_path} && bundle install --jobs `nproc`"
end

desc "Create the deployment package"
task :package => [ DIST, PACKAGE_FILE, SIGNATURE_FILE, WRAPPER_FILE ]

file PACKAGE_FILE => [ DIST, SOURCES, SIGNING_PUBKEY_FILE ] do
	LOCAL_TARGET.cmd "tar -cvzf #{PACKAGE_FILE} #{SOURCES.to_a.quoted.join(' ')} #{SIGNING_PUBKEY_FILE}"
end
file SIGNATURE_FILE => [ DIST, PACKAGE_FILE, SIGNING_KEY_FILE ] do
	LOCAL_TARGET.cmd "openssl dgst -sha256 -sign #{SIGNING_KEY_FILE} -out #{SIGNATURE_FILE} #{PACKAGE_FILE}"
end
file WRAPPER_FILE => [ DIST, PACKAGE_FILE, SIGNATURE_FILE ] do
	LOCAL_TARGET.cmd "tar -cvzf #{WRAPPER_FILE} #{SIGNATURE_FILE} #{PACKAGE_FILE}"
end

desc "Generate a signing key and certificate"
task :generate_keys => [ SIGNING_KEY_FILE, SIGNING_PUBKEY_FILE ]

file SIGNING_KEY_FILE do
	LOCAL_TARGET.sh "openssl req -nodes -x509 -sha256 -newkey rsa:4096 -keyout #{SIGNING_KEY_FILE} -out #{SIGNING_CERT_FILE} -days 3650 -subj #{SIGNING_SUBJECT.quoted}"
end

file SIGNING_PUBKEY_FILE => [ SIGNING_KEY_FILE ] do
	LOCAL_TARGET.sh "openssl x509 -in #{SIGNING_CERT_FILE} -pubkey -noout"
end

namespace :target do

	desc "Deploy installation package to the target"
	task :deploy => [ PACKAGE_FILE, SIGNATURE_FILE ] do
		TARGET.cmd "mkdir -p #{TARGET.base_path}/{#{USERS},#{LOCAL}}"
		TARGET.cp_to [ PACKAGE_FILE, SIGNATURE_FILE ], TARGET.temp_path
	end

	desc "Test the target system"
	task :test do
		TARGET.cmd "cd #{TARGET.base_path} && rake spec".quoted
	end

	desc "Take a screenshot and copy back"
	task :screenshot do
		shots = Dir['screenshot*.png']
		shot = (shots.sort.pop || 'screenshot00.png').pathmap('%n').succ + '.png'
		TARGET.cmd "DISPLAY=:0 scrot #{TARGET.temp_path}/#{shot}"
		TARGET.cp_from [ "#{TARGET.temp_path}/#{shot}" ], "./#{shot}"
		TARGET.cmd "rm #{TARGET.temp_path}/#{shot}"
	end

	desc "Wipe the target system"
	task :wipe do
		# note: this will require prep:app_folders to re-seed the signing certificate
		TARGET.cmd "rm -r #{TARGET.base_path}"
	end

	desc "Stop the app components on the target system"
	task :stop do
		TARGET.cmd "sudo killall midori kweb3 ruby || true"
	end

	desc "Reboot the target system"
	task :reboot do
		TARGET.cmd "sudo shutdown -r now"
	end

	desc "Shutdown the target system"
	task :shutdown do
		TARGET.cmd "sudo shutdown -h now"
	end

end # namespace :target

namespace :prep do

	desc "Prepare the target Raspberry Pi from Jessie Lite"
	task :lite => [ :cleanup, :update, :network, :wpa_us, :ntp, :"tz:pacific", :ntfs, :usb_automount, :ruby, :xwindows, :fonts, :wm, :midori, :omxplayer, :app_folders, :enable_auto_launch, :boot_screen ]

	desc "Prepare the target Raspberry Pi from Jessie (Full)"
	task :full => [ :cleanup, :update, :network, :wpa_us, :ntp, :"tz:pacific", :ntfs, :usb_automount, :wm, :midori, :omxplayer, :app_folders, :enable_auto_launch, :boot_screen ]

	desc "Disable unneeded features"
	task :cleanup do
		TARGET.cmd "sudo systemctl disable ModemManager.service"
		TARGET.cmd "sudo systemctl disable triggerhappy.service"

		# disable remote GPIO
 		TARGET.cmd "sudo rm -f /etc/systemd/system/pigpiod.service.d/public.conf"
 	end

	desc "Update the system image"
	task :update do
		TARGET.cmd "sudo apt-get -y update"
		TARGET.cmd "sudo apt-get -y upgrade"
	end

	desc "Configure the network interfaces"
	task :network do
		# enable DHCP on eth{0,1} and wlan{0,1}
		TARGET.cmd "sudo " + "sed -i -e 's/inet manual/inet dhcp/;s/iface eth0 inet dhcp/allow-hotplug eth0\\niface eth0 inet dhcp\\n\\nallow-hotplug eth1\\niface eth1 inet dhcp/' /etc/network/interfaces".quoted
		# disable wait for Ethernet on boot
		TARGET.cmd "sudo rm -f /etc/systemd/system/dhcpcd.service.d/wait.conf"
	end

	desc "Configure WiFi for US"
	task :wpa_us do
		TARGET.cmd "sudo " + "sed -i -e 's/country=GB/country=US/' /etc/wpa_supplicant/wpa_supplicant.conf".quoted
	end

	desc "Install and configure NTP"
	task :ntp do
		TARGET.cmd "sudo apt-get install -y ntpdate"
		TARGET.cmd "sudo ntpdate -u pool.ntp.org"
	end

	desc "Install NTFS support"
	task :ntfs do
		TARGET.cmd "sudo apt-get -y install ntfs-3g"
	end

	desc "Configure the system to automount USB storage devices"
	task :usb_automount do
		TARGET.cp_to FileList[File.join(CONF, "*.rules")].to_a, TARGET.temp_path
		TARGET.cmd "sudo mv -v #{TARGET.temp_path}/*.rules /etc/udev/rules.d/"
		TARGET.cmd "sudo udevadm control --reload-rules"
	end

	desc "Install ruby"
	task :ruby do
		TARGET.cmd "sudo apt-get -y install ruby rubygems bundler"
	end

	desc "Install minimal X Windows"
	task :xwindows do
		TARGET.cmd "sudo apt-get -y install xinit"
	end

	desc "Install additional fonts"
	task :fonts do
		TARGET.cmd "sudo apt-get -y install fonts-dejavu fonts-dejavu-extra fonts-droid fonts-freefont-ttf fonts-opensymbol fonts-roboto fonts-sil-gentium-basic xfonts-100dpi"
	end

	desc "Install minimal window manager"
	task :wm do
		TARGET.cmd "sudo apt-get -y install unclutter"
		TARGET.cmd "sudo apt-get -y install matchbox-window-manager"
	end

	desc "Install minimal web browser (kweb)"
	task :kweb do
		TARGET.cmd "wget -N -P #{TARGET.temp_path} http://steinerdatenbank.de/software/kweb-1.6.9.tar.gz"
		TARGET.cmd "tar -C #{TARGET.temp_path} -xzf #{TARGET.temp_path}/kweb-1.6.9.tar.gz"
		TARGET.cmd "cd #{TARGET.temp_path}/kweb-1.6.9 && sh ./debinstall".quoted
		TARGET.cmd "rm -r #{TARGET.temp_path}/kweb-1.6.9*"
	end

	desc "Install minimal web browser (midori)"
	task :midori do
		TARGET.cmd "sudo apt-get -y install midori"
	end

	desc "Install minimal audio/video player (omxplayer)"
	task :omxplayer do
		TARGET.cmd "sudo apt-get -y install omxplayer"
	end

	desc "Prepare subfolders for the application installation"
	task :app_folders => :generate_keys do
		TARGET.cmd "sudo mkdir -p /var/log/solo"
		TARGET.cmd "sudo chown #{TARGET.user}:#{TARGET.user} /var/log/solo"
	end

	desc "Set up #{TARGET.user} to auto-launch the app"
	task :enable_auto_launch do
		TARGET.cmd "echo . #{TARGET.base_path}/bin/run.sh >> ~/.profile".quoted
	end

	desc "Configure boot behavior"
	task :boot_screen do
		TARGET.cmd "sudo update-initramfs -c -t -k $(uname -r)"
		# tell the bootloader what image to use
		TARGET.cmd "echo initramfs initrd.img-$(uname -r) | sudo tee -a /boot/config.txt".quoted
		# turn off the rainbox square
		TARGET.cmd "echo disable_splash=1 | sudo tee -a /boot/config.txt".quoted
		# quiet the boot messages
		TARGET.cmd "sudo " + "sed -i -e 's/console=tty1/console=tty3 quiet loglevel=3/' /boot/cmdline.txt".quoted
		# re-generate initramfs
		TARGET.cmd "sudo update-initramfs -u"
	end

	namespace :tz do
		desc "Set timezone to Pacific"
		task :pacific do
			TARGET.cmd "sudo timedatectl set-timezone America/Los_Angeles"
		end

		desc "Set timezone to Mountain"
		task :central do
			TARGET.cmd "sudo timedatectl set-timezone America/Denver"
		end

		desc "Set timezone to Central"
		task :central do
			TARGET.cmd "sudo timedatectl set-timezone America/Chicago"
		end

		desc "Set timezone to Eastern"
		task :central do
			TARGET.cmd "sudo timedatectl set-timezone America/New_York"
		end
	end

	desc "Install screenshot utility"
	task :screenshot do
		TARGET.cmd "sudo apt-get -y install scrot"
	end

end # namespace :prep
