export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://sentinel_user:sentinel_password@localhost:5432/ionix_sentinel",
};
