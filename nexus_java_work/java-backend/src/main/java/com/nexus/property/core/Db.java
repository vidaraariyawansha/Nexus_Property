package com.nexus.property.core;
import org.springframework.jdbc.core.*;import org.springframework.stereotype.*;import java.util.*;
@Component
public class Db {
 private final JdbcTemplate j; public Db(JdbcTemplate j){this.j=j;}
 public List<Map<String,Object>> all(String sql,Object...args){ return j.queryForList(sql,args); }
 public Map<String,Object> one(String sql,Object...args){var a=all(sql,args);return a.isEmpty()?null:a.getFirst();}
 public int exec(String sql,Object...args){return j.update(sql,args);}
 public long scalarLong(String sql,Object...args){Number n=j.queryForObject(sql,Number.class,args);return n==null?0:n.longValue();}
 public String uuid(){return UUID.randomUUID().toString();}
}
