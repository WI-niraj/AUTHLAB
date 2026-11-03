
function getEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

export const config = {
    port: Number(process.env.PORT ?? 4000),

    host: process.env.HOST ?? '127.0.0.1',

    origin: getEnv('APP_ORIGIN'),

    databaseUrl: getEnv('DATABASE_URL'),

    nodeEnv: process.env.NODE_ENV ?? 'development',

    isProduction: process.env.NODE_ENV === 'production',
};
