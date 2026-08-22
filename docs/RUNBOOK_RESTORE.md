# Runbook backup / restore

Stack : Postgres Docker `newcarboscan-postgres`, volume `ncs_pg_data`.
Ne jamais restaurer un dump sur la prod sans snapshot préalable.

## Backup (prod VPS)

```bash
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && \
  docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --format=custom' \
  > "dumps/ncs-$(date +%Y%m%d-%H%M).dump"
```

SQL texte (debug) :

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner \
  > "dumps/ncs-$(date +%Y%m%d-%H%M).sql"
```

Copier hors du VPS. Conserver au moins 7 jours + 1 dump avant chaque déploiement.

## Restore (staging d’abord)

1. Stopper API/web : `docker compose stop api web`
2. Snapshot du volume actuel (ou dump de secours)
3. Restaurer :

```bash
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner < dumps/ncs-YYYYMMDD.dump
```

4. Relancer migrate : `docker compose run --rm migrate`
5. `docker compose start api web` puis `curl -fsS https://www.ktoptima.com/health`

## Checklist go-live

- [ ] `POSTGRES_PASSWORD` et `JWT_SECRET` forts, `.env` chmod 600
- [ ] `CORS_ORIGINS` = origines publiques uniquement (pas `*`)
- [ ] TLS nginx hôte, `HTTP_PORT=127.0.0.1:9087`
- [ ] `VITE_API_URL` vide en Docker (same-origin)
- [ ] Backup testé (restore dry-run sur une copie)
- [ ] Aucune mention « conforme ISO 14064 / SBTi / CBAM » dans les exports client
- [ ] Modules gelés (WattBim) non cliquables
- [ ] Superadmin + un tenant réel smoke-testés (login, dashboard, collecte, bilan)
