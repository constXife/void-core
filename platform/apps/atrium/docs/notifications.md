# Business Notifications Integration Guide

Atrium supports real-time business notifications from external systems like Home Assistant, Sonarr, and custom scripts. This guide explains how to integrate your systems with Atrium's notification API.

## Quick Start

Send a notification:

```bash
curl -X POST http://your-atrium-server:8080/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ужин готов!",
    "message": "Мама зовет всех на кухню",
    "icon": "🍽️"
  }'
```

## Notification API

### POST /api/notify

Create a new notification. This is a webhook endpoint that does not require authentication.
Recommend exposing it only inside a trusted network or behind a reverse proxy ACL.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Notification title (max 200 chars) |
| `message` | string | No | Detailed message text |
| `category` | string | No | `business` (default) or `tech` |
| `icon` | string | No | Emoji or Lucide icon name |
| `image_url` | string | No | URL to image (camera snapshot, etc.) |
| `service_key` | string | No | Link to a Atrium directory item (by key) |
| `actions` | array | No | Interactive buttons (see below) |
| `callback_url` | string | No | URL for action callbacks |
| `expires_at` | string | No | ISO 8601 timestamp for auto-dismiss |
| `dedup_key` | string | No | Key for updating existing notifications |

**Actions Format:**

```json
{
  "actions": [
    { "id": "ok", "label": "Иду!", "style": "primary" },
    { "id": "busy", "label": "Через 5 мин", "style": "secondary" },
    { "id": "cancel", "label": "Отменить", "style": "danger" }
  ]
}
```

Styles: `primary`, `secondary`, `danger`

**Response:** `201 Created` with the notification object.

### GET /api/notifications

List recent notifications. Requires authentication if enabled.

**Query Parameters:**
- `category` - Filter by category (`business` or `tech`)

### POST /api/notifications/:id/action

Trigger an action on a notification. This marks the notification as dismissed and sends a callback to the `callback_url`.

**Request Body:**
```json
{ "action_id": "ok" }
```

**Callback Payload:**
```json
{
  "notification_id": "uuid",
  "action_id": "ok",
  "user": "user@example.com",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### POST /api/notifications/:id/dismiss

Dismiss a notification without triggering an action.

## WebSocket

Connect to `/ws` for real-time updates. Messages are JSON:

```json
{ "type": "notification", "payload": { ...notification object } }
```

## Home Assistant Integration

### 1. Configure REST Command

Add to `configuration.yaml`:

```yaml
rest_command:
  atrium_notify:
    url: "http://atrium.local:8080/api/notify"
    method: POST
    headers:
      Content-Type: application/json
    payload: >
      {
        "category": "business",
        "title": "{{ title }}",
        "message": "{{ message | default('') }}",
        "icon": "{{ icon | default('') }}",
        "image_url": "{{ image_url | default('') }}",
        "callback_url": "{{ callback_url | default('') }}",
        "actions": {{ actions | default([]) | to_json }}
      }

```

### 2. Automation Examples

**Dinner Ready:**

```yaml
automation:
  - alias: "Atrium - Dinner Ready"
    trigger:
      - platform: state
        entity_id: input_boolean.dinner_ready
        to: "on"
    action:
      - service: rest_command.atrium_notify
        data:
          title: "Ужин готов!"
          message: "{{ states('input_text.dinner_menu') }}"
          icon: "🍽️"
          callback_url: "http://homeassistant.local:8123/api/webhook/atrium-response"
          actions:
            - id: "coming"
              label: "Иду!"
              style: "primary"
            - id: "later"
              label: "Через 5 мин"
              style: "secondary"
```

**Doorbell with Camera Snapshot:**

```yaml
automation:
  - alias: "Atrium - Doorbell"
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: "on"
    action:
      - service: camera.snapshot
        target:
          entity_id: camera.front_door
        data:
          filename: /config/www/doorbell.jpg
      - delay: 1
      - service: rest_command.atrium_notify
        data:
          title: "🔔 Кто-то у двери"
          message: "Звонок в дверь"
          image_url: "http://homeassistant.local:8123/local/doorbell.jpg"
          actions:
            - id: "open"
              label: "Открыть"
              style: "primary"
            - id: "ignore"
              label: "Игнорировать"
              style: "secondary"
```

### 3. Receive Action Callbacks

Create a webhook automation to handle responses:

```yaml
automation:
  - alias: "Handle Atrium Response"
    trigger:
      - platform: webhook
        webhook_id: atrium-response
    action:
      - choose:
          - conditions:
              - condition: template
                value_template: "{{ trigger.json.action_id == 'coming' }}"
            sequence:
              - service: notify.mobile_app_mom
                data:
                  message: "{{ trigger.json.user }} ответил: Иду!"
          - conditions:
              - condition: template
                value_template: "{{ trigger.json.action_id == 'open' }}"
            sequence:
              - service: lock.unlock
                target:
                  entity_id: lock.front_door
```

## Sonarr/Radarr Integration

Configure a webhook in Sonarr/Radarr to send notifications to Atrium.

**Webhook URL:** `http://atrium.local:8080/api/notify`

**Custom Script (sonarr-atrium.sh):**

```bash
#!/bin/bash

curl -X POST http://atrium.local:8080/api/notify \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"🍿 Новый эпизод\",
    \"message\": \"${sonarr_series_title} - S${sonarr_episodefile_seasonnumber}E${sonarr_episodefile_episodenumbers}\",
    \"icon\": \"tv\",
    \"service_key\": \"plex\"
  }"
```

## Timeline Widget

Display recent notifications in a widget on your Space.

Add to `widgets.yaml`:

```yaml
widgets:
  - id: family-feed
    type: timeline
    title: "Что происходит"
    spaces: ["home"]
    limit: 5
    categories: ["business"]
```

The widget automatically updates via WebSocket when new notifications arrive.

## Deduplication

Use `dedup_key` to update existing notifications instead of creating duplicates:

```json
{
  "title": "Downloading: Movie.mkv",
  "message": "Progress: 45%",
  "dedup_key": "download-movie-123"
}
```

Subsequent POSTs with the same `dedup_key` will update the existing notification.

## Categories

- `business` - Family/life events (default). Shown to all users, appear in Timeline widget.
- `tech` - System events. Shown in System Health dropdown, visible to admins.

## Expiration

Notifications auto-expire after 24 hours by default. Set `expires_at` for custom expiration:

```json
{
  "title": "Meeting in 30 minutes",
  "expires_at": "2025-01-01T12:30:00Z"
}
```


