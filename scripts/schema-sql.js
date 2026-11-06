// Cetak skema SQL:  npm run db:schema > supabase/schema.sql
process.stdout.write(require('../lib/schema').ddl());
