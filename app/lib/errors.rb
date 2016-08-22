class InternalError < RuntimeError
end

class AuthenticationError < RuntimeError
end

class AuthorizationError < RuntimeError
end

class TokenError < RuntimeError
end

class NoSuchResourceError < RuntimeError
end

class ConflictedResourceError < RuntimeError
end

def internal_error(reason)
	raise InternalError, reason
end

def no_such_resource(reason)
	raise NoSuchResourceError, reason
end

def unauthorized
	raise AuthenticationError, "invalid credentials"
end

def forbidden
	raise AuthorizationError, "forbidden operation"
end

def conflicted_resource(reason)
	raise ConflictedResourceError, "operation on resource failed: #{reason}"
end

def invalid_token
	raise TokenError #, "invalid token"
end

def not_implemented
	raise NotImplementedError
end

def missing_argument(arg)
	raise ArgumentError, "#{arg} is required"
end

def invalid_argument(arg, reason)
	raise ArgumentError, "invalid #{arg}: #{reason}"
end
