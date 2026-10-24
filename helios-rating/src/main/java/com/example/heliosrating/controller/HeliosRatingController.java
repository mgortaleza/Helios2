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

    @PutMapping("/filings/{id}")
    public ResponseEntity<RatePlanVersion> updateFiling(@PathVariable("id") int id, @RequestBody RatePlanVersion updated) {
        updated.setVersionId(id);
        RatePlanVersion saved = repository.updateVersion(updated);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/filings")
    public ResponseEntity<RatePlanVersion> createFiling(@RequestBody RatePlanVersion newVersion) {
        RatePlanVersion saved = repository.createVersion(newVersion);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/diagnostics")
    public ResponseEntity<Map<String, Object>> getDiagnostics() {
        Runtime rt = Runtime.getRuntime();
        long totalMem = rt.totalMemory();
        long freeMem = rt.freeMemory();
        long maxMem = rt.maxMemory();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("service", "Helios Insurance Rules & Rating Engine");
        map.put("status", "UP");
        map.put("version", "1.0.0-SNAPSHOT");
        map.put("timestamp", LocalDateTime.now().toString());
        map.put("availableProductsCount", repository.getAllProducts().size());
        map.put("availablePlansCount", repository.getAllPlans().size());
        map.put("activeStateFilingsCount", repository.getAllVersions().size());
        map.put("usedMemoryMb", (totalMem - freeMem) / (1024 * 1024));
        map.put("totalMemoryMb", totalMem / (1024 * 1024));
        map.put("maxMemoryMb", maxMem / (1024 * 1024));
        map.put("availableProcessors", rt.availableProcessors());
        map.put("activeThreads", Thread.activeCount());
        return ResponseEntity.ok(map);
    }
}

