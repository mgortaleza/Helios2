package com.example.helios2.config;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.example.helios2.service.TenantRegistryService;
import com.example.helios2.tenant.TenantRoutingDataSource;

@Configuration
public class MultiTenantConfig {

    @Value("${helios2.db.server:dbtst.ad.ortaleza.com}")
    private String dbServer;

    @Value("${helios2.db.master-catalog:MSTR_DATA}")
    private String masterCatalog;

    @Value("${helios2.db.default-tenant-catalog:HELIOS2_TST}")
    private String defaultTenantCatalog;

    @Value("${helios2.db.rating-catalog:Helios_Rating_DB}")
    private String ratingCatalog;

    @Bean(name = "masterDataSource")
    public DataSource masterDataSource(SqlServerDataSourceFactory factory) {
        return factory.createDataSource("Helios2-Master-MSTR_DATA", dbServer, masterCatalog);
    }

    @Bean(name = "masterJdbcTemplate")
    public JdbcTemplate masterJdbcTemplate(@Qualifier("masterDataSource") DataSource masterDataSource) {
        return new JdbcTemplate(masterDataSource);
    }

    @Bean(name = "ratingDataSource")
    public DataSource ratingDataSource(SqlServerDataSourceFactory factory) {
        return factory.createDataSource("Helios2-Rating-Helios_Rating_DB", dbServer, ratingCatalog);
    }

    @Bean(name = "ratingJdbcTemplate")
    public JdbcTemplate ratingJdbcTemplate(@Qualifier("ratingDataSource") DataSource ratingDataSource) {
        return new JdbcTemplate(ratingDataSource);
    }

    @Bean(name = "tenantRoutingDataSource")
    @Primary
    public TenantRoutingDataSource tenantRoutingDataSource(
            SqlServerDataSourceFactory factory,
            TenantRegistryService tenantRegistryService) {
        DataSource defaultTenantDs = factory.createDataSource(
                "Helios2-DefaultTenant-" + defaultTenantCatalog,
                dbServer,
                defaultTenantCatalog
        );
        return new TenantRoutingDataSource(factory, tenantRegistryService, defaultTenantDs);
    }

    @Bean(name = "tenantJdbcTemplate")
    @Primary
    public JdbcTemplate tenantJdbcTemplate(@Qualifier("tenantRoutingDataSource") DataSource tenantRoutingDataSource) {
        return new JdbcTemplate(tenantRoutingDataSource);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOriginPatterns("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }
}
