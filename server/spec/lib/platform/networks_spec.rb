require 'networks'

describe Networks do
	it "should produce a list wifi networks" do
		expect(Networks::list).to be_a(Array)
	end
end
