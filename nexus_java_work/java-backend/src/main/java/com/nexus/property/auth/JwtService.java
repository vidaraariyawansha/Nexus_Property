package com.nexus.property.auth;
import io.jsonwebtoken.*;import io.jsonwebtoken.security.Keys;import org.springframework.beans.factory.annotation.Value;import org.springframework.stereotype.Service;import javax.crypto.SecretKey;import java.nio.charset.StandardCharsets;import java.util.*;
@Service public class JwtService {
 private final SecretKey key; private final int days;
 public JwtService(@Value("${nexus.jwt.secret}") String secret,@Value("${nexus.jwt.days:7}") int days){this.key=Keys.hmacShaKeyFor(Arrays.copyOf(secret.getBytes(StandardCharsets.UTF_8),Math.max(32,secret.getBytes(StandardCharsets.UTF_8).length)));this.days=days;}
 public String create(String id,String email,String role,String fullName,boolean remember){long now=System.currentTimeMillis(), exp=now+(remember?30L:days)*86400000L;return Jwts.builder().subject(id).claim("userId",id).claim("email",email).claim("role",role).claim("fullName",fullName).issuedAt(new Date(now)).expiration(new Date(exp)).signWith(key).compact();}
 public Claims parse(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();}
}
