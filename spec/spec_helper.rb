require File.join(File.dirname(File.expand_path(__FILE__)), '..', 'app', 'platform')
require 'fakefs/spec_helpers'
require 'securerandom'

class Uuid
	UUID_PATTERN = /^\h{8}-\h{4}-4\h{3}-[89ab]\h{3}-\h{12}$/.freeze

	class << self
		def new_uuid
			SecureRandom.uuid
		end

		def valid?(uuid)
			uuid =~ UUID_PATTERN
		end
	end
end

RSpec::Matchers.define :be_frozen do
	match do |actual|
		actual.frozen?
	end
end

RSpec::Matchers.define :be_uuid do
	match do |actual|
		Uuid::valid?(actual)
	end
end

RSpec::Matchers.define :be_readable_path do
	match do |actual|
		Dir.exist?(actual) && File.readable?(actual)
	end
end

RSpec::Matchers.define :be_writable_path do
	match do |actual|
		Dir.exist?(actual) && File.writable?(actual)
	end
end

RSpec.configure do |config|
	config.include FakeFS::SpecHelpers

	config.expect_with :rspec do |c|
		c.syntax = :expect
	end

	config.around(:example) do |ex|
		FakeFS.activate!
		FileUtils.mkdir_p(Platform::LOCAL_PATH)
		FileUtils.mkdir_p(Platform::USERS_PATH)

		ex.run

		FakeFS.deactivate!
	end
end
