#!/bin/bash
# Найти путь к проекту через docker inspect
docker inspect loginus-backend --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' | grep -v node_modules | head -1


