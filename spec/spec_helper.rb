require File.join(File.dirname(File.expand_path(__FILE__)), '..', 'app', 'platform')
require 'fakefs/spec_helpers'

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
