package com.nexus.property.auth;
import jakarta.servlet.*;import jakarta.servlet.http.*;import org.springframework.stereotype.Component;import org.springframework.web.filter.OncePerRequestFilter;import java.io.IOException;
@Component public class AuthFilter extends OncePerRequestFilter {
 private final JwtService jwt; public static final String ATTR="nexus.user"; public AuthFilter(JwtService jwt){this.jwt=jwt;}
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
  String h=req.getHeader("Authorization"); if(h!=null&&h.startsWith("Bearer ")) try{var c=jwt.parse(h.substring(7));req.setAttribute(ATTR,new CurrentUser(c.getSubject(),c.get("email",String.class),c.get("role",String.class),c.get("fullName",String.class)));}catch(Exception ignored){}
  chain.doFilter(req,res);
 }
 public static CurrentUser user(HttpServletRequest r){return (CurrentUser)r.getAttribute(ATTR);} public static CurrentUser require(HttpServletRequest r){var u=user(r);if(u==null)throw com.nexus.property.core.Api.error(401,"Authentication required.");return u;}
 public static CurrentUser role(HttpServletRequest r,String...roles){var u=require(r);for(String x:roles)if(x.equals(u.role()))return u;throw com.nexus.property.core.Api.error(403,"Access forbidden: insufficient role privileges.");}
}
