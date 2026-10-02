package com.nexus.property.config;
import com.nexus.property.auth.AuthFilter;import org.springframework.context.annotation.*;import org.springframework.security.config.annotation.web.builders.HttpSecurity;import org.springframework.security.config.http.SessionCreationPolicy;import org.springframework.security.web.*;import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
@Configuration public class SecurityConfig {
 @Bean SecurityFilterChain filter(HttpSecurity h,AuthFilter f)throws Exception{return h.csrf(c->c.disable()).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).authorizeHttpRequests(a->a.anyRequest().permitAll()).addFilterBefore(f,UsernamePasswordAuthenticationFilter.class).build();}
}
