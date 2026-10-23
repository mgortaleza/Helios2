package com.example.helios2.config;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

import javax.security.auth.login.AppConfigurationEntry;
import javax.security.auth.login.Configuration;
import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import jakarta.annotation.PostConstruct;

@Component
public class SqlServerDataSourceFactory {

    @Value("${helios2.db.port:1433}")
    private int defaultPort;

    @Value("${helios2.krb5.realm:AD.ORTALEZA.COM}")
    private String krb5Realm;

    @Value("${helios2.krb5.kdc:ad.ortaleza.com}")
    private String krb5Kdc;

    public static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    @PostConstruct
    public void initKerberosIfNonWindows() {
        if (!isWindows()) {
            System.setProperty("java.security.krb5.realm", krb5Realm);
            System.setProperty("java.security.krb5.kdc", krb5Kdc);
            System.setProperty("javax.security.auth.useSubjectCredsOnly", "false");

            final String ticketCachePath = getDefaultTicketCachePath();
            Configuration.setConfiguration(new Configuration() {
                @Override
                public AppConfigurationEntry[] getAppConfigurationEntry(String name) {
                    Map<String, String> options = new HashMap<>();
                    options.put("useTicketCache", "true");
                    options.put("doNotPrompt", "true");
                    options.put("refreshKrb5Config", "true");
                    if (ticketCachePath != null) {
                        options.put("ticketCache", ticketCachePath);
                    }
                    return new AppConfigurationEntry[] {
                        new AppConfigurationEntry(
                            "com.sun.security.auth.module.Krb5LoginModule",
                            AppConfigurationEntry.LoginModuleControlFlag.REQUIRED,
                            options
                        )
                    };
                }
            });
        }
    }

    public String buildJdbcUrl(String serverName, String catalogName) {
        String hostPart = serverName.contains(":") ? serverName : serverName + ":" + defaultPort;
        StringBuilder url = new StringBuilder();
        url.append("jdbc:sqlserver://").append(hostPart).append(";")
           .append("databaseName=").append(catalogName).append(";")
           .append("integratedSecurity=true;")
           .append("encrypt=true;")
           .append("trustServerCertificate=true;");
        if (!isWindows()) {
            url.append("authenticationScheme=JavaKerberos;");
        }
        return url.toString();
    }

    public DataSource createDataSource(String poolName, String serverName, String catalogName) {
        HikariConfig config = new HikariConfig();
        config.setPoolName(poolName);
        config.setDriverClassName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
        config.setJdbcUrl(buildJdbcUrl(serverName, catalogName));
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(10000);
        return new HikariDataSource(config);
    }

    private String getDefaultTicketCachePath() {
        String envCache = System.getenv("KRB5CCNAME");
        if (envCache != null && !envCache.isBlank()) {
            return envCache.replaceFirst("^FILE:", "");
        }
        File tmpDir = new File("/tmp");
        File[] matches = tmpDir.listFiles((dir, name) -> name.startsWith("krb5cc_"));
        if (matches != null && matches.length > 0) {
            return matches[0].getAbsolutePath();
        }
        return null;
    }
}

