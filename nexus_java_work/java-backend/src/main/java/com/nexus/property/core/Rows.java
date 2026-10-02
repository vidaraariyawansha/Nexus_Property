package com.nexus.property.core;
import com.fasterxml.jackson.databind.*;import java.util.*;
public final class Rows {
 private static final ObjectMapper M=new ObjectMapper(); private Rows(){}
 public static String s(Map<String,Object> r,String k){Object v=r.get(k);return v==null?null:String.valueOf(v);} public static long l(Map<String,Object>r,String k){Object v=r.get(k);return v instanceof Number n?n.longValue():v==null?0:Long.parseLong(v.toString());}
 public static double d(Map<String,Object>r,String k){Object v=r.get(k);return v instanceof Number n?n.doubleValue():v==null?0:Double.parseDouble(v.toString());}
 public static boolean b(Map<String,Object>r,String k){return l(r,k)==1 || Boolean.TRUE.equals(r.get(k));}
 public static List<String> jsonList(Object v){try{return v==null?new ArrayList<>():M.readValue(v.toString(),M.getTypeFactory().constructCollectionType(List.class,String.class));}catch(Exception e){return new ArrayList<>();}}
 public static String json(Object v){try{return M.writeValueAsString(v);}catch(Exception e){return "[]";}}
}
