require 'spec_helper'

describe Platform do
	context "should define path" do
		context "BIN_PATH" do
			it "should be readable" do
				FakeFS.deactivate!
				expect( Dir.exist?(Platform::BIN_PATH) ).to be true
				FakeFS.activate!
			end
		end

		context "PLATFORM_PATH" do
			it "should be accessible" do
				FakeFS.deactivate!
				expect( Platform::PLATFORM_PATH ).to be_a(String)
				expect( Platform::PLATFORM_PATH ).to be_readable_path
				FakeFS.activate!
			end
		end

		context "LOCAL_PATH" do
			it "should be accessible" do
				FakeFS.deactivate!
				expect( Platform::LOCAL_PATH ).to be_a(String)
				expect( Platform::LOCAL_PATH ).to be_readable_path
				expect( Platform::LOCAL_PATH ).to be_writable_path
				FakeFS.activate!
			end
		end

		context "USERS_PATH" do
			it "should be accessible" do
				FakeFS.deactivate!
				expect( Platform::USERS_PATH ).to be_a(String)
				expect( Platform::USERS_PATH ).to be_readable_path
				expect( Platform::USERS_PATH ).to be_writable_path
				FakeFS.activate!
			end
		end

		context "LOGS_PATH" do
			it "should be writable" do
				FakeFS.deactivate!
				expect( Platform::LOGS_PATH ).to be_a(String)
				expect( Platform::LOGS_PATH ).to be_writable_path
				FakeFS.activate!
			end
		end
	end

	context "product constants" do
		context "PRODUCT_NAME" do
			it "should be valid" do
				expect( Platform::PRODUCT_NAME ).to be_a(String)
				expect( Platform::PRODUCT_NAME ).to be_frozen
				expect( Platform::PRODUCT_NAME ).to match(/^\w+$/)
			end
		end

		context "PRODUCT_VERSION" do
			it "should be valid" do
				expect( Platform::PRODUCT_VERSION ).to be_a(String)
				expect( Platform::PRODUCT_VERSION ).to be_frozen
				expect( Platform::PRODUCT_VERSION ).to match(/^\d+\.\d+$/)
			end
		end

		context "PRODUCT_FULLNAME" do
			it "should be valid" do
				expect( Platform::PRODUCT_FULLNAME ).to be_a(String)
				expect( Platform::PRODUCT_FULLNAME ).to be_frozen
				expect( Platform::PRODUCT_FULLNAME ).to include(Platform::PRODUCT_NAME)
				expect( Platform::PRODUCT_FULLNAME ).to include(Platform::PRODUCT_VERSION)
			end
		end
	end

	context "PLATFORM_TYPE" do
		it "should be valid" do
			expect( Platform::PLATFORM_TYPE ).to be_a(String)
			expect( Platform::PLATFORM_TYPE ).to be_frozen
			expect( Platform::pi? ^ Platform::pc? ).to be true
		end
	end
end
