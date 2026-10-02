package com.nexus.property.core;
import java.util.*;
public final class Api {
  private Api() {}
  public static Map<String,Object> ok(Object data){ var m=new LinkedHashMap<String,Object>();m.put("success",true);if(data!=null)m.put("data",data);return m; }
  public static Map<String,Object> ok(String msg,Object data){ var m=ok(data);m.put("message",msg);return m; }
  public static Map<String,Object> message(String msg){ var m=new LinkedHashMap<String,Object>();m.put("success",true);m.put("message",msg);return m; }
  public static RuntimeException error(int status,String msg){ return new ApiException(status,msg); }
}
