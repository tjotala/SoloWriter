require 'errors'
require 'user'

class Users
	def list
		User.list
	end

	def from_id(id, password)
		user = User.from_id(id)
		unauthorized unless user.password?(password)
		user
	end

	def from_name(username, password)
		user = User.from_name(username)
		unauthorized unless user.password?(password)
		user
	end

	def new_token(user)
		token = user.new_token
		user.save
		token
	end

	def from_token(token)
		User.from_token(token)
	end

	def create(username, password)
		forbidden if User.exist?(username)
		User.create(username, password).save
	end

	def update_username(id, password, new_username)
		user = from_id(id, password)
		user.new_username(new_username).save
	end

	def update_password(id, password, new_password)
		user = from_id(id, password)
		forbidden if user.password?(new_password) # new_password == old_password
		user.new_password(new_password).save
	end

	def delete(id, password)
		user = from_id(id, password)
		user.delete
	end
end
