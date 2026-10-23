package com.example.heliosrating;

import com.example.heliosrating.model.RatingRequest;
import com.example.heliosrating.model.RatingResult;
import com.example.heliosrating.service.RatingEngineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class RatingEngineTest {

    @Autowired
    private RatingEngineService ratingService;

    @Test
    public void testCaliforniaTechEORatingWithReferral() {
        RatingRequest req = new RatingRequest();
        req.setProductCode("TECH_EO");
        req.setStateCode("CA");
        req.setClassCode("TECH_SAAS");
        req.setTerritoryCode("CA_SF");
        req.setEffectiveDate(LocalDate.of(2026, 7, 1));
        req.setBusinessType("NEW");
        req.setExposureValue(new BigDecimal("10000000")); // $10M revenue
        req.setOccurrenceLimit(5000000L);
        req.setAggregateLimit(5000000L);
        req.setRetentionAmount(50000L);
        req.setScheduleMod(new BigDecimal("0.90")); // 10% credit
        req.setRiskAnswers(Map.of("priorLossesCount", 0));

        RatingResult result = ratingService.rate(req);

        assertNotNull(result);
        assertEquals("CA", result.getStateCode());
        assertEquals("CA-2025-0812-EO", result.getSerffTrackingNumber());
        assertEquals("2025.1", result.getResolvedFilingVersion());
        assertTrue(result.getFinalAnnualPremium().compareTo(new BigDecimal("10000")) > 0);
        assertTrue(result.getAttachedForms().stream().anyMatch(f -> f.contains("CA-NOTICE-60D")));
        System.out.println("=== TECH E&O CA RATED SUCCESS ===");
        System.out.println("Final Premium: $" + result.getFinalAnnualPremium());
        System.out.println("SERFF: " + result.getSerffTrackingNumber());
        System.out.println("Forms: " + result.getAttachedForms());
    }

    @Test
    public void testNationwideFallbackAndLimitReferral() {
        RatingRequest req = new RatingRequest();
        req.setProductCode("TECH_EO");
        req.setStateCode("WA"); // No specific WA filing -> falls back to 'ALL' nationwide
        req.setExposureValue(new BigDecimal("5000000"));
        req.setOccurrenceLimit(10000000L); // $10M limit triggers UW referral
        req.setRetentionAmount(25000L);

        RatingResult result = ratingService.rate(req);

        assertEquals("ALL", result.getStateCode());
        assertEquals("REFERRED", result.getRatingStatus());
        assertTrue(result.getUnderwritingReferrals().stream().anyMatch(r -> r.contains("SENIOR_UW_REFERRAL")));
        System.out.println("=== NATIONWIDE FALLBACK & REFERRAL TEST SUCCESS ===");
        System.out.println("Status: " + result.getRatingStatus());
        System.out.println("Referrals: " + result.getUnderwritingReferrals());
    }
}
