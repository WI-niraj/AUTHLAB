
import postgres from 'postgres';
import { config } from '../config/index.js';

export const sql = postgres(config.databaseUrl, {
    max: 10,
    connect_timeout: 5,
    idle_timeout: 20,
});
