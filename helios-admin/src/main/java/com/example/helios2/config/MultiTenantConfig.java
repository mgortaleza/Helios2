package com.example.helios2.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.annotation.PropertySources;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.example.helios2.service.TenantRegistryService;
import com.example.helios2.tenant.TenantRoutingDataSource;

@Configuration
@PropertySources({
    @PropertySource(value = "file:C:/helios-config/database.properties", ignoreResourceNotFound = true),
    @PropertySource(value = "file:C:/helios-storage/database.properties", ignoreResourceNotFound = true),
    @PropertySource(value = "file:./database.properties", ignoreResourceNotFound = true),
    @PropertySource(value = "file:../database.properties", ignoreResourceNotFound = true)
})
public class MultiTenantConfig {

    private static final Logger log = LoggerFactory.getLogger(MultiTenantConfig.class);

    @Value("${helios2.db.server:dbtst.ads.netyx.net}")
    private String dbServer;

    @Value("${helios2.db.master-catalog:MSTR_DATA}")
    private String masterCatalog;

    @Value("${helios2.db.default-tenant-catalog:HELIOS2_TST}")
    private String defaultTenantCatalog;

    @Value("${helios2.db.rating-catalog:Helios_Rating_DB}")
    private String ratingCatalog;

    @Bean(name = "masterDataSource")
    public DataSource masterDataSource(SqlServerDataSourceFactory factory) {
        log.info("Connecting Master Data Source (MSTR_DATA) to SQL Server at '{}', catalog '{}'", dbServer, masterCatalog);
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
