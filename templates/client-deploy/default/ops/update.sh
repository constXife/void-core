#!/usr/bin/env bash
set -euo pipefail

nix flake update
sudo nixos-rebuild switch --flake .#core-01
