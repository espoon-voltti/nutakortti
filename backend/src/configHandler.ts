import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SamlConfig, ValidateInResponseTo } from '@node-saml/node-saml';
import { RedisClientOptions } from 'redis';

export class ConfigHelper {
  static isTest() {
    return process.env.NODE_ENV === 'test';
  }

  static getJWTSecret(): string {
    return process.env.JWT || 'Remember to make me more secure before prod!';
  }

  static getDatabaseConnection(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: process.env.RDS_HOSTNAME || 'localhost',
      port: +process.env.RDS_PORT || 5432,
      username: process.env.RDS_USERNAME || 'postgres',
      password: process.env.RDS_PASSWORD || 'password',
      database: process.env.RDS_DB_NAME || 'nuta',
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: true,
      // typeorm 1.0 changed the default to 'throw'. Keep the 0.3 behaviour so
      // the upgrade does not change query semantics; tightening this deserves
      // its own PR (see setChallenge() and getUniqueJunior() in
      // junior.service.ts, which can pass null/undefined into a where clause).
      invalidWhereValuesBehavior: { null: 'ignore', undefined: 'ignore' },
    };
  }

  static getFrontendPort(): string {
    return process.env.FRONTEND_BASE_URL || 'http://localhost:3001/';
  }

  static getAdminFrontEndBaseUrl(): string {
    return process.env.FRONTEND_BASE_URL
      ? `${process.env.FRONTEND_BASE_URL}/nuorisotyontekijat`
      : 'http://localhost:3002/';
  }

  static getApiBaseUrl(): string {
    return process.env.API_BASE_URL || 'http://localhost:3000/';
  }

  static getRedisOptions(): {
    host: string | undefined;
    port: number | undefined;
    password: string | undefined;
    tlsServerName: string | undefined;
    disableSecurity: boolean;
  } {
    return {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: parseInteger(process.env.REDIS_PORT) ?? 6379,
      password: process.env.REDIS_PASSWORD,
      tlsServerName: process.env.REDIS_TLS_SERVER_NAME,
      disableSecurity: parseBoolean(process.env.REDIS_DISABLE_SECURITY) ?? true,
    };
  }

  static getSamlConfig(): SamlConfig & { isMock: boolean } {
    const adMock = parseBoolean(process.env.AD_MOCK);

    if (adMock) {
      return {
        isMock: true,
        entryPoint: `${process.env.API_BASE_URL}saml-auth/fake-login`,
        issuer: 'mock-issuer',
        callbackUrl: `${process.env.API_BASE_URL}saml-auth/callback`,
        idpCert: 'fake cert',
      };
    }
    return {
      isMock: false,
      callbackUrl: `${process.env.API_BASE_URL}api/saml-ad/login/callback`,
      logoutCallbackUrl: `${process.env.API_BASE_URL}api/saml-ad/logout/callback`,
      entryPoint: process.env.AD_SAML_ENTRYPOINT_URL,
      logoutUrl: process.env.AD_SAML_LOGOUT_URL,
      issuer: process.env.AD_SAML_ISSUER,
      publicCert: process.env.AD_SAML_PUBLIC_CERT,
      idpCert: process.env.AD_SAML_IDP_CERT,
      privateKey: process.env.AD_SAML_PRIVATE_CERT,
      validateInResponseTo: ValidateInResponseTo.always,
      signatureAlgorithm: 'sha256',
      identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
      acceptedClockSkewMs: 0,
      disableRequestedAuthnContext: true,
      // When *both* wantXXXXSigned settings are false, passport-saml still
      // requires at least the whole response *or* the assertion to be signed, so
      // these settings don't introduce a security problem
      wantAssertionsSigned: false,
      wantAuthnResponseSigned: false,
    };
  }

  static getCryptoSecretKey(): string {
    return process.env.CRYPTO_SECRET_KEY;
  }
}

interface RedisConfig {
  host: string | undefined;
  port: number | undefined;
  password: string | undefined;
  tlsServerName: string | undefined;
  disableSecurity: boolean;
}

export const toRedisClientOpts = (config: RedisConfig): RedisClientOptions => ({
  socket: {
    host: config.host,
    port: config.port,
    // Without redis, the client's endless reconnect timers keep the node
    // event loop alive, which hangs jest after an otherwise green run - and
    // the tests must run without redis.
    ...(ConfigHelper.isTest() ? { reconnectStrategy: false as const } : undefined),
    ...(config.disableSecurity
      ? undefined
      : { tls: true, servername: config.tlsServerName }),
  },
  ...(config.disableSecurity ? undefined : { password: config.password }),
});

function parseInteger(value: string) {
  const result = Number.parseInt(value, 10);
  if (Number.isNaN(result)) {
    return undefined;
  }
  return result;
}

const booleans: Record<string, boolean> = {
  1: true,
  0: false,
  true: true,
  false: false,
};

function parseBoolean(value: string) {
  if (value in booleans) return booleans[value];
  return undefined;
}
