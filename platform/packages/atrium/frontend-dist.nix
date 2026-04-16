{
  pkgs,
  src,
}:
pkgs.runCommand "atrium-frontend-dist" {} ''
  test -f ${src}/backend/internal/web/dist/index.html

  mkdir -p "$out"
  cp -R ${src}/backend/internal/web/dist/. "$out"/
''
