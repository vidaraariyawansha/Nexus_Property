package com.nexus.property.config;
import org.springframework.context.annotation.*;import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.CommandLineRunner;
@Configuration public class SqliteConfig { @Bean CommandLineRunner pragma(JdbcTemplate j){return a->{j.execute("PRAGMA foreign_keys=ON");};} }
