# Privacy in plain language

Atrium is built so that basic work stays on your side. This page explains what the product sees, what it does not send out by default, and what the administrator of this installation can realistically access.

> **What this page describes**
>
> This page describes the Atrium code we publish and the baseline installation that comes with it.
>
> Forks, heavy customizations, and external services chosen by the administrator can change the real privacy picture.
>
> [Published foundation source: void-core on GitHub](https://github.com/constXife/void-core)

## Local by default

Atrium is meant to run on your own server or inside your own installation. Basic sign-in, navigation, and access to your spaces should not require a third-party cloud to keep working.

Atrium stores the accounts, spaces, access rules, and configuration needed to open the right places for the right people. It does not need to publish your private spaces before sign-in.

## What the administrator can see

The administrator of this installation may be able to see account identifiers, assigned access, configured resources, and operational status needed to keep the installation running. Atrium should not pretend the administrator sees nothing.

## What does not leave by default

Basic use should not silently send your content, private space names, or everyday activity to external analytics or vendor-hosted control planes.

Telemetry is expected to be off by default. If a particular installation enables an external integration, that should be visible in its own documentation or administrator-facing settings.

## Backups and recovery

Backups may contain configuration and other data needed to restore the installation. Administrators should treat backups with the same care as the running system.

## What can change these promises

This page describes the version of Atrium code we publish and the baseline installation that comes with it.

A forked or heavily customized installation may have different rules. If someone changes the code, adds custom content or integrations, or keeps this page without updating it, the real privacy behavior may no longer match this text.

External services chosen by the administrator, such as cloud backups, identity providers, mail, storage, logging, or analytics, are outside Atrium's direct control. Their own privacy and retention rules apply on top of Atrium.
