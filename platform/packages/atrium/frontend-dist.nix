{
  pkgs,
  src,
}:
pkgs.runCommand "atrium-frontend-dist" {} ''
  test -f ${src}/frontend/dist/index.html

  mkdir -p "$out"
  cp -R ${src}/frontend/dist/. "$out"/
''
