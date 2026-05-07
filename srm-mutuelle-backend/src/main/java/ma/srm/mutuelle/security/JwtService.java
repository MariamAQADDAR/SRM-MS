package ma.srm.mutuelle.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import ma.srm.mutuelle.config.JwtProperties;
import ma.srm.mutuelle.domain.AppUser;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	private final JwtProperties properties;
	private final SecretKey secretKey;

	public JwtService(JwtProperties properties) {
		this.properties = properties;
		byte[] keyBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
		if (keyBytes.length < 32) {
			throw new IllegalStateException("app.jwt.secret must be at least 32 bytes for HS256");
		}
		this.secretKey = Keys.hmacShaKeyFor(keyBytes);
	}

	public String generateToken(AppUser user) {
		Date now = new Date();
		Date exp = new Date(now.getTime() + properties.expirationMs());
		return Jwts.builder()
				.subject(String.valueOf(user.getId()))
				.claim("email", user.getEmail())
				.claim("role", user.getRole().name())
				.claim("agentId", user.getAgentIdOrNull())
				.issuedAt(now)
				.expiration(exp)
				.signWith(secretKey)
				.compact();
	}

	public Claims parseClaims(String token) {
		return Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
	}

	public Long parseUserId(String token) {
		return Long.parseLong(parseClaims(token).getSubject());
	}
}
