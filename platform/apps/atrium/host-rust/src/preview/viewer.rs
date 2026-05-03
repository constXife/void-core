fn preview_viewer() -> PreviewViewer {
    let authenticated = preview_bool_env("VOID_ATRIUM_PREVIEW_AUTHENTICATED", false)
        || preview_bool_env("ATRIUM_PREVIEW_AUTHENTICATED", false);
    let role = preview_string_env(&[
        "VOID_ATRIUM_PREVIEW_ROLE",
        "ATRIUM_PREVIEW_ROLE",
    ])
    .unwrap_or_else(|| {
        if authenticated {
            "admin".to_string()
        } else {
            "guest".to_string()
        }
    });
    let user_id = preview_string_env(&[
        "VOID_ATRIUM_PREVIEW_USER_ID",
        "ATRIUM_PREVIEW_USER_ID",
    ])
    .unwrap_or_else(|| {
        if authenticated {
            "preview-user".to_string()
        } else {
            "guest".to_string()
        }
    });
    let email = preview_string_env(&[
        "VOID_ATRIUM_PREVIEW_EMAIL",
        "ATRIUM_PREVIEW_EMAIL",
    ])
    .unwrap_or_else(|| {
        if authenticated {
            format!("{user_id}@preview.local")
        } else {
            String::new()
        }
    });
    PreviewViewer {
        user_id,
        email,
        role,
        authenticated,
    }
}

fn preview_me_json() -> String {
    let viewer = preview_viewer();
    format!(
        "{{\"authenticated\":{},\"email\":{},\"role\":{},\"user_id\":{}}}",
        if viewer.authenticated { "true" } else { "false" },
        json_string(&viewer.email),
        json_string(&viewer.role),
        json_string(&viewer.user_id)
    )
}

fn preview_memberships_json() -> String {
    let viewer = preview_viewer();
    if !viewer.authenticated || viewer.role.trim().is_empty() || viewer.role == "guest" {
        return "[]".to_string();
    }
    format!(
        "[{{\"subject_id\":{},\"subject_email\":{},\"role_key\":{},\"role_name\":{}}}]",
        json_string(&viewer.user_id),
        json_string(&viewer.email),
        json_string(&viewer.role),
        json_string(&preview_role_label(&viewer.role))
    )
}

fn preview_role_label(role: &str) -> String {
    let normalized = role.trim();
    if normalized.is_empty() {
        return "Guest".to_string();
    }
    let mut chars = normalized.chars();
    let Some(first) = chars.next() else {
        return "Guest".to_string();
    };
    format!(
        "{}{}",
        first.to_ascii_uppercase(),
        chars.collect::<String>()
    )
}

fn preview_string_env(keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        env::var(key)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    })
}

fn preview_bool_env(key: &str, default: bool) -> bool {
    match env::var(key).ok().map(|value| value.trim().to_ascii_lowercase()) {
        Some(value) if matches!(value.as_str(), "1" | "true" | "yes" | "on") => true,
        Some(value) if matches!(value.as_str(), "0" | "false" | "no" | "off") => false,
        _ => default,
    }
}
