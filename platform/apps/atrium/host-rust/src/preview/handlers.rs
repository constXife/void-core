fn preview_response(
    method: &str,
    raw_path: &str,
    body: &str,
    state: &mut PreviewState,
) -> (&'static str, &'static str, String) {
    let path = raw_path.split('?').next().unwrap_or("/");
    let requested_space_id = query_param(raw_path, "space_id");

    match path {
        "/health" => (
            "200 OK",
            "application/json; charset=utf-8",
            "{\"status\":\"ok\",\"mode\":\"foundation-preview\"}".to_string(),
        ),
        "/api/auth/modes" => (
            "200 OK",
            "application/json; charset=utf-8",
            "{\"oidc\":false,\"dev\":false,\"local\":false}".to_string(),
        ),
        "/api/me" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_me_json(),
        ),
        "/atrium/widgets" if method == "GET" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_widgets_json(&state.catalog),
        ),
        "/atrium/spaces" if method == "GET" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_spaces_json(state),
        ),
        "/atrium/spaces" if method == "POST" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_create_space(state, body),
        ),
        "/atrium/directory-items" if method == "GET" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_directory_items_json(state, requested_space_id.as_deref()),
        ),
        "/atrium/directory-items" if method == "POST" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_create_directory_item(state, body),
        ),
        "/atrium/memberships" if method == "GET" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_memberships_json(),
        ),
        "/atrium/dashboard/save" if method == "POST" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_save_dashboard(state, requested_space_id.as_deref(), body),
        ),
        "/atrium/provisioning/summary" if method == "GET" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_summary_json(state),
        ),
        "/atrium/provisioning/catalog" if method == "GET" => (
            "200 OK",
            "application/json; charset=utf-8",
            preview_catalog_json(state),
        ),
        "/atrium/provisioning/dashboard" if method == "GET" => match preview_current_space(state, requested_space_id.as_deref()) {
            Some(space) => (
                "200 OK",
                "application/json; charset=utf-8",
                preview_dashboard_json(state, space),
            ),
            None => (
                "404 Not Found",
                "application/json; charset=utf-8",
                "{\"error\":\"space_not_found\"}".to_string(),
            ),
        },
        "/atrium/workspace" if method == "GET" => match preview_current_space(state, requested_space_id.as_deref()) {
            Some(space) => (
                "200 OK",
                "application/json; charset=utf-8",
                preview_workspace_json(state, space),
            ),
            None => (
                "404 Not Found",
                "application/json; charset=utf-8",
                "{\"error\":\"space_not_found\"}".to_string(),
            ),
        },
        _ if path.starts_with("/atrium/spaces/") => {
            let space_id = path.trim_start_matches("/atrium/spaces/");
            if method == "GET" {
                return match preview_current_space(state, Some(space_id)) {
                    Some(space) => (
                        "200 OK",
                        "application/json; charset=utf-8",
                        preview_space_detail_json(state, space),
                    ),
                    None => (
                        "404 Not Found",
                        "application/json; charset=utf-8",
                        "{\"error\":\"space_not_found\"}".to_string(),
                    ),
                };
            }

            if method == "PATCH" {
                return preview_patch_space(state, space_id, body);
            }
            if method == "DELETE" {
                return preview_delete_space(state, space_id);
            }
            if let Some(target_id) = space_id.strip_suffix("/archive") {
                if method == "POST" {
                    return preview_archive_space(state, target_id, true);
                }
            }
            if let Some(target_id) = space_id.strip_suffix("/restore") {
                if method == "POST" {
                    return preview_archive_space(state, target_id, false);
                }
            }
            (
                "405 Method Not Allowed",
                "application/json; charset=utf-8",
                "{\"error\":\"method_not_allowed\"}".to_string(),
            )
        }
        _ if path.starts_with("/atrium/directory-items/") => {
            let item_id = path.trim_start_matches("/atrium/directory-items/");
            if method == "PATCH" {
                return preview_patch_directory_item(state, item_id, body);
            }
            if method == "DELETE" {
                return preview_delete_directory_item(state, item_id);
            }
            (
                "405 Method Not Allowed",
                "application/json; charset=utf-8",
                "{\"error\":\"method_not_allowed\"}".to_string(),
            )
        }
        _ => {
            if method == "GET" {
                if let Some(static_response) = preview_static_response(raw_path) {
                    return static_response;
                }
            }
            (
                "404 Not Found",
                "application/json; charset=utf-8",
                "{\"error\":\"not_found\"}".to_string(),
            )
        }
    }
}
