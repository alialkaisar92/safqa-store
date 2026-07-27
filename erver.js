[1mdiff --git a/server.js b/server.js[m
[1mindex b6d7161..b355e5d 100644[m
[1m--- a/server.js[m
[1m+++ b/server.js[m
[36m@@ -8,6 +8,21 @@[m [mconst API_KEY = 'sk_9f6d15ecb31c980ae65661abca57d1e3f7c850811f78569955cb47dea4e4[m
 const BASE_URL = 'https://api.safka-eg.com/api/v1/public';[m
 app.use(express.json());[m
 [m
[32m+[m[32mconst path = require('path');[m
[32m+[m
[32m+[m[32mapp.use(express.static(__dirname));[m
[32m+[m
[32m+[m[32mapp.get('/googleb92b2cd0a1a64ca9.html', (req, res) => {[m
[32m+[m[32m  res.sendFile(path.join(__dirname, 'googleb92b2cd0a1a64ca9.html'));[m
[32m+[m[32m});[m
[32m+[m
[32m+[m[32mapp.get('/robots.txt', (req, res) => {[m
[32m+[m[32m  res.sendFile(path.join(__dirname, 'robots.txt'));[m
[32m+[m[32m});[m
[32m+[m
[32m+[m[32mapp.get('/sitemap.xml', (req, res) => {[m
[32m+[m[32m  res.sendFile(path.join(__dirname, 'sitemap.xml'));[m
[32m+[m[32m});[m
 app.use(express.static(__dirname));[m
 [m
 app.get('/googleb92b2cd0a1a64ca9.html', (req, res) => {[m
