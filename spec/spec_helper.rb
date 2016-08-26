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

RSpec::Matchers.define :be_a_uuid do
	match do |actual|
		Uuid::valid?(actual)
	end
end

RSpec.configure do |config|
	config.include FakeFS::SpecHelpers

	config.expect_with :rspec do |c|
		c.syntax = :expect
	end

	config.around(:example) do |ex|
		FakeFS.activate!
		FileUtils.mkdir_p(Platform::DOCS_PATH)
		FileUtils.mkdir_p(Platform::USERS_PATH)

		ex.run

		FakeFS.deactivate!
	end
end
