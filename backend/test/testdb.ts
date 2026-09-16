import { DataSource, DataSourceOptions } from 'typeorm';

// The entities need PostgreSQL (e.g. "timestamp with time zone" columns), so the
// tests run against a real server: docker-compose's db locally, a service
// container in CI. Connection settings mirror ConfigHelper.getDatabaseConnection()
// but the tests get their own database, dropped clean at every suite start, so
// they never touch the development data.
const connection = {
    type: 'postgres' as const,
    host: process.env.RDS_HOSTNAME || 'localhost',
    port: +process.env.RDS_PORT || 5432,
    username: process.env.RDS_USERNAME || 'postgres',
    password: process.env.RDS_PASSWORD || 'password',
};

const testDatabase = process.env.TEST_DB_NAME || 'nuta_test';

async function ensureTestDatabaseExists(): Promise<void> {
    const bootstrap = new DataSource({
        ...connection,
        database: 'postgres',
    } as DataSourceOptions);
    await bootstrap.initialize();
    try {
        const existing = await bootstrap.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [testDatabase],
        );
        if (existing.length === 0) {
            await bootstrap.query(`CREATE DATABASE "${testDatabase}"`);
        }
    } finally {
        await bootstrap.destroy();
    }
}

export async function getTestDB(): Promise<DataSource> {
    await ensureTestDatabaseExists();
    const dataSource = new DataSource({
        ...connection,
        database: testDatabase,
        entities: ['src/**/*.entity{.ts,.js}'],
        synchronize: true,
        dropSchema: true,
        // Match the production setting in ConfigHelper.getDatabaseConnection().
        invalidWhereValuesBehavior: { null: 'ignore', undefined: 'ignore' },
    });
    return await dataSource.initialize();
}
