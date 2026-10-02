package com.nexus.property.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.property.core.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {
  private final Db db;
  private final String key;
  private final ObjectMapper om = new ObjectMapper();

  public AiController(Db db, @Value("${nexus.gemini.api-key:}") String key) {
    this.db = db;
    this.key = key;
  }

  @PostMapping({"/advisor", "/advisory"})
  public Map<String,Object> advisor(HttpServletRequest r, @RequestBody Map<String,Object> b) {
    String q = Objects.toString(b.getOrDefault("message", b.getOrDefault("query", ""))).trim();
    if (q.isBlank()) throw Api.error(400, "Please enter a question.");
    String answer;
    if (key.isBlank()) answer = local(q);
    else {
      try { answer = gemini(q); }
      catch (Exception e) { answer = local(q); }
    }
    return Api.ok("AI advisor response generated.", Map.of(
      "message", answer,
      "response", answer,
      "answer", answer,
      "source", key.isBlank() ? "local-fallback" : "gemini"
    ));
  }

  @GetMapping("/valuation/{propertyId}")
  public Map<String,Object> valuation(@PathVariable String propertyId) {
    var p = db.one("SELECT * FROM properties WHERE id=?", propertyId);
    if (p == null) throw Api.error(404, "Property not found.");
    double price = Rows.d(p, "price"), area = Math.max(1, Rows.d(p, "area"));
    return Api.ok(Map.of(
      "propertyId", propertyId,
      "estimatedValue", price,
      "pricePerArea", Math.round(price / area * 100.0) / 100.0,
      "confidence", "listing-based",
      "note", "Estimate preserves the existing listing value when no external valuation provider is configured."
    ));
  }

  @GetMapping("/suggestions")
  public Map<String,Object> suggestions() {
    return Api.ok(List.of(
      "Show me properties in Colombo",
      "Find houses under my budget",
      "Compare saved properties",
      "What should I check before a viewing?"
    ));
  }

  @GetMapping("/metrics")
  public Map<String,Object> metrics() {
    return Api.ok(Map.of(
      "activeListings", db.scalarLong("SELECT COUNT(*) FROM properties WHERE status='ACTIVE'"),
      "locations", db.scalarLong("SELECT COUNT(DISTINCT location) FROM properties WHERE status='ACTIVE'")
    ));
  }

  @PostMapping("/clear-context")
  public Map<String,Object> clear() { return Api.message("AI advisor context cleared."); }

  private String local(String q) {
    var rows = db.all("SELECT title,location,price,bedrooms,bathrooms,area FROM properties WHERE status='ACTIVE' ORDER BY created_at DESC LIMIT 5");
    if (rows.isEmpty()) return "I can help with property search, comparisons, appointments, and listing questions. There are currently no active listings to recommend.";
    StringBuilder s = new StringBuilder("Based on the current Nexus Property listings, here are a few relevant options:\n");
    for (var p : rows) {
      s.append("• ").append(Rows.s(p,"title"))
        .append(" — ").append(Rows.s(p,"location"))
        .append(" — LKR ").append(String.format("%,.0f", Rows.d(p,"price"))).append("\n");
    }
    s.append("You can refine this by location, budget, property type, bedrooms, or amenities.");
    return s.toString();
  }

  private String gemini(String q) throws Exception {
    String context = om.writeValueAsString(db.all("SELECT title,description,property_type,location,price,bedrooms,bathrooms,area,amenities FROM properties WHERE status='ACTIVE' LIMIT 30"));
    String prompt = "You are the Nexus Property real-estate advisor for Sri Lanka. Be concise, factual, and use only the supplied listing context when recommending listings.\nListings: " + context + "\nUser: " + q;
    Map<String,Object> requestBody = Map.of(
      "contents", List.of(Map.of(
        "parts", List.of(Map.of("text", prompt))
      ))
    );
    String body = om.writeValueAsString(requestBody);
    var req = HttpRequest.newBuilder(URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key))
      .timeout(Duration.ofSeconds(15))
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(body))
      .build();
    var res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
    if (res.statusCode() / 100 != 2) throw new RuntimeException("Gemini failed");
    var root = om.readTree(res.body());
    return root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(local(q));
  }
}
