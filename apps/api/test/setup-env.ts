// Charge l'environnement de test (base lavio_test) avant chaque fichier de test.
process.env['NODE_ENV'] = 'test';
process.loadEnvFile('.env.test');
