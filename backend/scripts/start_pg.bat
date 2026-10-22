@echo off
"C:\Users\prith\pgsql-16\bin\pg_ctl.exe" -D "C:\Users\prith\pgsql-16\data" -l "C:\Users\prith\pgsql-16\pg.log" -o "-p 5432 -c listen_addresses=localhost" start
