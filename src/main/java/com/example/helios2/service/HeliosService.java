package com.example.helios2.service;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import com.example.helios2.service.TenantRegistryService.DbPingResult;

@Service
public class HeliosService {

    private final JdbcTemplate tenantJdbcTemplate;

    public HeliosService(@Qualifier("tenantJdbcTemplate") JdbcTemplate tenantJdbcTemplate) {
        this.tenantJdbcTemplate = tenantJdbcTemplate;
    }

    public record PartyDto(int id, String name) {
    }

    public record SubmissionDto(int submsnId, String submsnNbr, int insuredPid, String orgName) {
    }

    public List<SubmissionDto> getAllSubmissions() {
        String sql = """
                SELECT s.SUBMSN_ID, s.SUBMSN_NBR, s.INSURED_PID, p.ORG_NM
                FROM dbo.UW_SUBMSN s
                JOIN dbo.PT_PARTY p ON s.INSURED_PID = p.PARTY_ID
                ORDER BY s.SUBMSN_ID DESC
                """;
        return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new SubmissionDto(
                rs.getInt("SUBMSN_ID"),
                rs.getString("SUBMSN_NBR"),
                rs.getInt("INSURED_PID"),
                rs.getString("ORG_NM")
        ));
    }

    public List<PartyDto> searchParties(String query) {
        if (query == null || query.isBlank()) {
            String sql = "SELECT PARTY_ID, ORG_NM FROM dbo.PT_PARTY ORDER BY ORG_NM ASC";
            return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new PartyDto(
                    rs.getInt("PARTY_ID"),
                    rs.getString("ORG_NM")
            ));
        }
        String sql = "SELECT PARTY_ID, ORG_NM FROM dbo.PT_PARTY WHERE ORG_NM LIKE ? ORDER BY ORG_NM ASC";
        return tenantJdbcTemplate.query(
                sql,
                (rs, rowNum) -> new PartyDto(rs.getInt("PARTY_ID"), rs.getString("ORG_NM")),
                "%" + query.trim() + "%"
        );
    }

    public PartyDto createParty(String orgName) {
        if (orgName == null || orgName.isBlank()) {
            throw new IllegalArgumentException("Organization Name cannot be empty.");
        }
        String trimmed = orgName.trim();
        String sql = "INSERT INTO dbo.PT_PARTY (ORG_NM) VALUES (?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        tenantJdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, trimmed);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        int newId = key != null ? key.intValue() : -1;
        return new PartyDto(newId, trimmed);
    }

    public SubmissionDto createSubmission(int partyId) {
        String sql = """
                INSERT INTO dbo.UW_SUBMSN (SUBMSN_NBR, INSURED_PID)
                OUTPUT inserted.SUBMSN_ID, inserted.SUBMSN_NBR, inserted.INSURED_PID
                SELECT CAST(ISNULL(MAX(TRY_CAST(SUBMSN_NBR AS INT)), 99999) + 1 AS VARCHAR(50)), ?
                FROM dbo.UW_SUBMSN
                """;
        return tenantJdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            int subId = rs.getInt("SUBMSN_ID");
            String subNbr = rs.getString("SUBMSN_NBR");
            int pid = rs.getInt("INSURED_PID");
            String orgName = tenantJdbcTemplate.queryForObject(
                    "SELECT ORG_NM FROM dbo.PT_PARTY WHERE PARTY_ID = ?",
                    String.class,
                    pid
            );
            return new SubmissionDto(subId, subNbr, pid, orgName);
        }, partyId);
    }

    public DbPingResult pingTenantDatabase() {
        try {
            return tenantJdbcTemplate.queryForObject(
                    "SELECT SYSTEM_USER AS auth_user, DB_NAME() AS db_name, @@SERVERNAME AS srv_name, @@VERSION AS version",
                    (rs, rowNum) -> new DbPingResult(
                            true,
                            rs.getString("db_name"),
                            rs.getString("srv_name"),
                            rs.getString("auth_user"),
                            rs.getString("version"),
                            null
                    )
            );
        } catch (Exception e) {
            return new DbPingResult(false, "UNKNOWN_TENANT_DB", null, null, null, e.getMessage());
        }
    }
}

