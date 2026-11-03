import postgres from 'postgres';

const sql = postgres(
    'postgresql://authlab:authlab@127.0.0.1:5444/authlab',
    {
        connect_timeout: 5,
        max: 1,
    }
);

try {
    console.log('Connecting to PostgreSQL...');

    const result = await sql`SELECT NOW() AS time`;

    console.log('Connected successfully:', result);
} catch (error) {
    console.error('Connection failed:', error);
    process.exitCode = 1;
} finally {
    await sql.end({ timeout: 5 });
}