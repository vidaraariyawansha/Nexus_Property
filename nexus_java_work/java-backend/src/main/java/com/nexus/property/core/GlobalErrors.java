package com.nexus.property.core;
import org.springframework.http.*;import org.springframework.web.bind.annotation.*;import java.util.*;
@RestControllerAdvice
public class GlobalErrors {
 @ExceptionHandler(ApiException.class) ResponseEntity<?> api(ApiException e){return ResponseEntity.status(e.status).body(Map.of("success",false,"message",e.getMessage()));}
 @ExceptionHandler(Exception.class) ResponseEntity<?> other(Exception e){e.printStackTrace();return ResponseEntity.status(500).body(Map.of("success",false,"message","Internal server error."));}
}
