export function configured(){ return Boolean(process.env.DB_URL && process.env.DB_API_KEY); }
