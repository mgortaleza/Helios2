package com.example.heliosrating.controller;

import com.example.heliosrating.model.Product;
import com.example.heliosrating.model.RatePlanVersion;
import com.example.heliosrating.model.RatingPlan;
import com.example.heliosrating.model.RatingRequest;
import com.example.heliosrating.model.RatingResult;
import com.example.heliosrating.repository.RatingRepository;
import com.example.heliosrating.service.RatingEngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class HeliosRatingController {

    @Autowired
    private RatingEngineService ratingService;

    @Autowired
    private RatingRepository repository;

    @PostMapping("/rate")
    public ResponseEntity<RatingResult> calculateRate(@RequestBody RatingRequest request) {
        RatingResult result = ratingService.rate(request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/products")
    public ResponseEntity<List<Product>> getProducts() {
        return ResponseEntity.ok(repository.getAllProducts());
    }

    @GetMapping("/plans")
    public ResponseEntity<List<RatingPlan>> getPlans() {
        return ResponseEntity.ok(repository.getAllPlans());
    }

    @GetMapping("/filings")
    public ResponseEntity<List<RatePlanVersion>> getFilings() {
        return ResponseEntity.ok(repository.getAllVersions());
    }

    @GetMapping("/diagnostics")
    public ResponseEntity<Map<String, Object>> getDiagnostics() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("service", "Helios Insurance Rules & Rating Engine");
        map.put("status", "UP");
        map.put("version", "1.0.0-SNAPSHOT");
        map.put("timestamp", LocalDateTime.now().toString());
        map.put("availableProductsCount", repository.getAllProducts().size());
        map.put("availablePlansCount", repository.getAllPlans().size());
        map.put("activeStateFilingsCount", repository.getAllVersions().size());
        return ResponseEntity.ok(map);
    }
}
