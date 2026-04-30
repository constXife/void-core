use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone)]
struct LocalizedText {
    key: String,
    translations: BTreeMap<String, String>,
}

#[derive(Debug, Clone)]
struct PreviewSpace {
    id: String,
    title: LocalizedText,
    state: String,
    space_type: String,
    layout: String,
    description: LocalizedText,
    groups: Vec<String>,
    dashboard_template: String,
}

#[derive(Debug, Clone)]
struct PreviewTemplateBlock {
    id: String,
    block_type: String,
    title: LocalizedText,
    limit: i64,
}

#[derive(Debug, Clone)]
struct PreviewTemplate {
    key: String,
    blocks: Vec<PreviewTemplateBlock>,
}

#[derive(Debug, Clone)]
struct PreviewCatalog {
    client_root_path: String,
    widgets_path: String,
    spaces: Vec<PreviewSpace>,
    templates: BTreeMap<String, PreviewTemplate>,
    resource_count: usize,
    placement_count: usize,
    widget_count: usize,
}

#[derive(Debug, Clone)]
struct PreviewDirectoryItem {
    id: String,
    resource_id: String,
    space_id: String,
    title: LocalizedText,
    description: LocalizedText,
    url: String,
    item_type: String,
    pinned: bool,
    order: i64,
}

#[derive(Debug, Clone)]
struct PreviewPlacementEntry {
    resource_id: String,
    pinned: bool,
    order: i64,
}

#[derive(Debug, Clone)]
struct PreviewState {
    catalog: PreviewCatalog,
    directory_items: Vec<PreviewDirectoryItem>,
    next_id: usize,
}

#[derive(Debug, Clone)]
struct PreviewViewer {
    user_id: String,
    email: String,
    role: String,
    authenticated: bool,
}

fn main() {
    match env::var("ATRIUM_HOST_MODE")
        .ok()
        .unwrap_or_default()
        .trim()
    {
        "" => run_preview(),
        "preview" => run_preview(),
        "shim" => run_shim(),
        value => {
            eprintln!("atrium-host-rust: unsupported ATRIUM_HOST_MODE={value}");
            std::process::exit(2);
        }
    }
}

fn run_shim() {
    let downstream = env::var("ATRIUM_DOWNSTREAM_HOST_BIN")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "void-atrium-web".to_string());

    let error = Command::new(&downstream).args(env::args().skip(1)).exec();
    eprintln!("atrium-host-rust: failed to exec {downstream}: {error}");
    std::process::exit(127);
}

fn run_preview() {
    let listen_address = env::var("VOID_ATRIUM_WEB_LISTEN_ADDRESS")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "127.0.0.1".to_string());
    let listen_port = env::var("VOID_ATRIUM_WEB_PORT")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "8080".to_string());
    let socket = format!("{listen_address}:{listen_port}");
    let listener = TcpListener::bind(&socket)
        .unwrap_or_else(|error| panic!("atrium-host-rust: failed to bind {socket}: {error}"));
    let catalog = load_preview_catalog();
    let mut state = PreviewState::from_catalog(catalog);
    eprintln!("atrium-host-rust preview listening on {socket}");

    for stream in listener.incoming() {
        let Ok(mut stream) = stream else {
            continue;
        };
        let mut buffer = [0u8; 4096];
        let Ok(read) = stream.read(&mut buffer) else {
            continue;
        };
        if read == 0 {
            continue;
        }
        let request = String::from_utf8_lossy(&buffer[..read]);
        let line = request.lines().next().unwrap_or_default();
        let method = line.split_whitespace().next().unwrap_or("GET");
        let raw_path = line.split_whitespace().nth(1).unwrap_or("/");
        let body = request_body(&request);
        let (status, content_type, body) = preview_response(method, raw_path, body, &mut state);
        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes());
    }
}

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

impl PreviewState {
    fn from_catalog(catalog: PreviewCatalog) -> Self {
        let client_root_path = catalog.client_root_path.clone();
        Self {
            catalog,
            directory_items: load_preview_directory_items(&PathBuf::from(client_root_path)),
            next_id: 1,
        }
    }

    fn next_generated_id(&mut self, prefix: &str) -> String {
        let value = format!("{prefix}-{}", self.next_id);
        self.next_id += 1;
        value
    }

    fn client_root_dir(&self) -> PathBuf {
        PathBuf::from(&self.catalog.client_root_path)
    }

    fn reload_catalog(&mut self) {
        self.catalog = load_preview_catalog();
        self.directory_items = load_preview_directory_items(&self.client_root_dir());
    }
}

fn load_preview_catalog() -> PreviewCatalog {
    let client_root_path = env::var("VOID_ATRIUM_CLIENT_ROOT_PATH")
        .ok()
        .or_else(|| env::var("ATRIUM_CLIENT_ROOT_PATH").ok())
        .unwrap_or_else(|| ".".to_string());
    let widgets_path = env::var("VOID_ATRIUM_WIDGETS_PATH")
        .ok()
        .or_else(|| env::var("ATRIUM_WIDGETS_PATH").ok())
        .unwrap_or_default();
    let client_root = PathBuf::from(&client_root_path);

    let mut spaces = load_preview_spaces(&client_root.join("spaces"));
    if spaces.is_empty() {
        spaces.push(default_preview_space());
    }

    let mut templates = load_preview_templates(&client_root.join("templates"));
    if templates.is_empty() {
        let template = default_preview_template();
        templates.insert(template.key.clone(), template);
    }

    let widgets_source = if widgets_path.trim().is_empty() {
        String::new()
    } else {
        fs::read_to_string(&widgets_path).unwrap_or_default()
    };

    PreviewCatalog {
        client_root_path,
        widgets_path,
        spaces,
        templates,
        resource_count: list_yaml_files(&client_root.join("resources")).len(),
        placement_count: list_yaml_files(&client_root.join("placements")).len(),
        widget_count: parse_widgets_count(&widgets_source),
    }
}

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

fn load_preview_directory_items(client_root: &Path) -> Vec<PreviewDirectoryItem> {
    let placements_dir = client_root.join("placements");
    let resources_dir = client_root.join("resources");
    let mut items = Vec::new();

    for path in list_yaml_files(&placements_dir) {
        let source = fs::read_to_string(&path).unwrap_or_default();
        let space_id = parse_scalar(&source, "space").unwrap_or_else(|| {
            path.file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("space")
                .to_string()
        });
        for entry in parse_placement_resources(&source) {
            let resource_path = resources_dir.join(format!("{}.yaml", entry.resource_id));
            let resource_source = fs::read_to_string(&resource_path).unwrap_or_default();
            items.push(PreviewDirectoryItem {
                id: format!("{}:{}", space_id, entry.resource_id),
                resource_id: entry.resource_id.clone(),
                space_id: space_id.clone(),
                title: parse_localized_text(
                    &resource_source,
                    "title",
                    &format!("atrium.resource.{}.title", entry.resource_id),
                ),
                description: parse_localized_text(
                    &resource_source,
                    "description",
                    &format!("atrium.resource.{}.description", entry.resource_id),
                ),
                url: parse_scalar(&resource_source, "url").unwrap_or_default(),
                item_type: parse_scalar(&resource_source, "type")
                    .unwrap_or_else(|| "resource".to_string()),
                pinned: entry.pinned,
                order: entry.order,
            });
        }
    }

    items.sort_by(|left, right| {
        (
            if left.pinned { 0 } else { 1 },
            left.order,
            localized_text_sort_key(&left.title),
            left.id.clone(),
        )
            .cmp(&(
                if right.pinned { 0 } else { 1 },
                right.order,
                localized_text_sort_key(&right.title),
                right.id.clone(),
            ))
    });
    items
}

fn load_preview_spaces(directory: &Path) -> Vec<PreviewSpace> {
    let mut spaces = Vec::new();
    for path in list_yaml_files(directory) {
        let source = fs::read_to_string(&path).unwrap_or_default();
        let fallback_id = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("space")
            .to_string();
        let id = parse_scalar(&source, "id").unwrap_or(fallback_id);
        spaces.push(PreviewSpace {
            title: parse_localized_text(&source, "title", &format!("atrium.space.{id}.title")),
            state: parse_scalar(&source, "state").unwrap_or_else(|| "active".to_string()),
            space_type: parse_scalar(&source, "type").unwrap_or_else(|| "staff".to_string()),
            layout: parse_scalar(&source, "layout").unwrap_or_else(|| "grid".to_string()),
            description: parse_localized_text(
                &source,
                "description",
                &format!("atrium.space.{id}.description"),
            ),
            groups: parse_string_list(&source, "groups"),
            dashboard_template: parse_scalar(&source, "dashboard_template")
                .unwrap_or_else(|| "admin-default".to_string()),
            id,
        });
    }
    spaces.sort_by(|left, right| left.id.cmp(&right.id));
    spaces
}

fn load_preview_templates(directory: &Path) -> BTreeMap<String, PreviewTemplate> {
    let mut templates = BTreeMap::new();
    for path in list_yaml_files(directory) {
        let source = fs::read_to_string(&path).unwrap_or_default();
        let fallback_key = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("template")
            .to_string();
        let key = parse_scalar(&source, "id").unwrap_or(fallback_key);
        let mut blocks = parse_template_blocks(&source);
        if blocks.is_empty() {
            blocks.push(default_preview_block());
        }
        templates.insert(key.clone(), PreviewTemplate { key, blocks });
    }
    templates
}

fn list_yaml_files(directory: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };
    let mut files = entries
        .filter_map(|entry| entry.ok().map(|value| value.path()))
        .filter(|path| {
            matches!(
                path.extension().and_then(|value| value.to_str()),
                Some("yaml" | "yml")
            )
        })
        .collect::<Vec<_>>();
    files.sort();
    files
}

fn preview_current_space<'a>(
    state: &'a PreviewState,
    requested_space_id: Option<&str>,
) -> Option<&'a PreviewSpace> {
    if let Some(space_id) = requested_space_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return state.catalog.spaces.iter().find(|space| space.id == space_id);
    }
    state
        .catalog
        .spaces
        .iter()
        .find(|space| !space.state.eq_ignore_ascii_case("archived"))
        .or_else(|| state.catalog.spaces.first())
}

fn preview_template_for_space<'a>(
    state: &'a PreviewState,
    space: &PreviewSpace,
) -> PreviewTemplate {
    state
        .catalog
        .templates
        .get(space.dashboard_template.as_str())
        .cloned()
        .unwrap_or_else(default_preview_template)
}

fn preview_spaces_json(state: &PreviewState) -> String {
    let items = state
        .catalog
        .spaces
        .iter()
        .map(preview_space_json)
        .collect::<Vec<_>>();
    format!("[{}]", items.join(","))
}

fn preview_space_detail_json(state: &PreviewState, space: &PreviewSpace) -> String {
    let template = preview_template_for_space(state, space);
    format!(
        "{{\"space\":{},\"template\":{},\"directory_items\":{},\"resources\":[],\"placements\":[]}}",
        preview_current_space_json(state, space),
        preview_template_json(&template),
        preview_directory_items_json(state, Some(space.id.as_str()))
    )
}

fn preview_summary_json(state: &PreviewState) -> String {
    let active_space_ids = state
        .catalog
        .spaces
        .iter()
        .filter(|space| !space.state.eq_ignore_ascii_case("archived"))
        .map(|space| json_string(&space.id))
        .collect::<Vec<_>>();
    format!(
        "{{\"configured\":true,\"exists\":true,\"path\":{},\"summary\":{{\"role_count\":0,\"template_count\":{},\"space_count\":{},\"directory_item_count\":{},\"active_space_ids\":[{}],\"widgets_count\":{}}},\"mode\":\"foundation-preview\"}}",
        json_string(&state.catalog.client_root_path),
        state.catalog.templates.len(),
        state.catalog.spaces.len(),
        state.directory_items.len(),
        active_space_ids.join(","),
        state.catalog.widget_count
    )
}

fn preview_catalog_json(state: &PreviewState) -> String {
    let spaces = state
        .catalog
        .spaces
        .iter()
        .map(preview_space_json)
        .collect::<Vec<_>>();
    let templates = state
        .catalog
        .templates
        .values()
        .map(|template| {
            let block_types = template
                .blocks
                .iter()
                .map(|block| json_string(&block.block_type))
                .collect::<Vec<_>>();
            format!(
                "{{\"key\":{},\"version\":1,\"blocks_count\":{},\"block_types\":[{}]}}",
                json_string(&template.key),
                template.blocks.len(),
                block_types.join(",")
            )
        })
        .collect::<Vec<_>>();
    format!(
        "{{\"configured\":true,\"exists\":true,\"path\":{},\"catalog\":{{\"roles\":[],\"templates\":[{}],\"spaces\":[{}],\"directory_items\":{}}},\"source\":{{\"spaces\":{},\"resources\":{},\"placements\":{},\"templates\":{},\"roles\":0}},\"mode\":\"foundation-preview\"}}",
        json_string(&state.catalog.client_root_path),
        templates.join(","),
        spaces.join(","),
        preview_directory_items_json(state, None),
        state.catalog.spaces.len(),
        state.catalog.resource_count,
        state.catalog.placement_count,
        state.catalog.templates.len()
    )
}

fn preview_dashboard_json(state: &PreviewState, space: &PreviewSpace) -> String {
    let template = preview_template_for_space(state, space);
    let hidden_block_ids = preview_hidden_block_ids(state, space);
    let block_types = template
        .blocks
        .iter()
        .map(|block| json_string(&block.block_type))
        .collect::<Vec<_>>();
    format!(
        "{{\"configured\":true,\"exists\":true,\"path\":{},\"space_id\":{},\"space\":{{\"id\":{},\"title\":{},\"dashboard_template\":{}}},\"template\":{},\"blocks_count\":{},\"blocks\":{},\"block_order\":{},\"hidden_block_ids\":{},\"visible_block_ids\":{},\"visible_blocks\":{},\"block_types\":[{}],\"mode\":\"foundation-preview\"}}",
        json_string(&state.catalog.client_root_path),
        json_string(&space.id),
        json_string(&space.id),
        localized_text_json(&space.title),
        json_string(&space.dashboard_template),
        preview_template_json(&template),
        template.blocks.len(),
        preview_blocks_json(state, space, &template, &hidden_block_ids),
        preview_block_order_json(&template),
        json_string_array(&hidden_block_ids),
        preview_visible_block_ids_json(&template, &hidden_block_ids),
        preview_visible_blocks_json(state, space, &template, &hidden_block_ids),
        block_types.join(",")
    )
}

fn preview_workspace_json(state: &PreviewState, current_space: &PreviewSpace) -> String {
    format!(
        "{{\"workspace\":{},\"diagnostics\":[],\"mode\":\"foundation-preview\"}}",
        preview_workspace_object_json(state, current_space)
    )
}

fn preview_workspace_object_json(state: &PreviewState, current_space: &PreviewSpace) -> String {
    let spaces = state
        .catalog
        .spaces
        .iter()
        .map(|space| preview_current_space_json(state, space))
        .collect::<Vec<_>>();
    format!(
        "{{\"spaces\":[{}],\"current_space\":{},\"resources\":[],\"directory_items\":{}}}",
        spaces.join(","),
        preview_current_space_json(state, current_space),
        preview_directory_items_json(state, Some(current_space.id.as_str()))
    )
}

fn preview_directory_items_json(state: &PreviewState, space_id: Option<&str>) -> String {
    let items = state
        .directory_items
        .iter()
        .filter(|item| match space_id {
            Some(space_id) => item.space_id == space_id,
            None => true,
        })
        .map(preview_directory_item_json)
        .collect::<Vec<_>>();
    format!("[{}]", items.join(","))
}

fn preview_directory_item_json(item: &PreviewDirectoryItem) -> String {
    format!(
        "{{\"id\":{},\"resource_id\":{},\"space_id\":{},\"title\":{},\"description\":{},\"url\":{},\"item_type\":{},\"pinned\":{},\"order\":{}}}",
        json_string(&item.id),
        json_string(&item.resource_id),
        json_string(&item.space_id),
        localized_text_json(&item.title),
        localized_text_json(&item.description),
        json_string(&item.url),
        json_string(&item.item_type),
        if item.pinned { "true" } else { "false" },
        item.order
    )
}

fn preview_current_space_json(state: &PreviewState, space: &PreviewSpace) -> String {
    let base = preview_space_json(space);
    let template = preview_template_for_space(state, space);
    let hidden_block_ids = preview_hidden_block_ids(state, space);
    let dashboard = preview_dashboard_state_json(state, space, &template, &hidden_block_ids);
    let entries = preview_directory_items_json(state, Some(space.id.as_str()));
    let visible_order = preview_space_entries_visible_order_json(state, &space.id);
    let base = base.trim_end_matches('}');
    format!(
        "{base},\"template\":{},\"entries\":{{\"items\":{},\"visible_order\":{}}},\"dashboard\":{}}}",
        json_string(&space.dashboard_template),
        entries,
        visible_order,
        dashboard
    )
}

fn preview_dashboard_state_json(
    state: &PreviewState,
    space: &PreviewSpace,
    template: &PreviewTemplate,
    hidden_block_ids: &[String],
) -> String {
    format!(
        "{{\"template\":{},\"blocks\":{},\"block_order\":{},\"hidden_block_ids\":{},\"visible_block_ids\":{},\"visible_blocks\":{}}}",
        preview_template_json(template),
        preview_blocks_json(state, space, template, hidden_block_ids),
        preview_block_order_json(template),
        json_string_array(hidden_block_ids),
        preview_visible_block_ids_json(template, hidden_block_ids),
        preview_visible_blocks_json(state, space, template, hidden_block_ids)
    )
}

fn preview_block_order_json(template: &PreviewTemplate) -> String {
    let order = template
        .blocks
        .iter()
        .map(|block| json_string(&block.id))
        .collect::<Vec<_>>();
    format!("[{}]", order.join(","))
}

fn preview_visible_block_ids_json(
    template: &PreviewTemplate,
    hidden_block_ids: &[String],
) -> String {
    let ids = template
        .blocks
        .iter()
        .filter(|block| !hidden_block_ids.contains(&block.id))
        .map(|block| json_string(&block.id))
        .collect::<Vec<_>>();
    format!("[{}]", ids.join(","))
}

fn preview_space_entries_visible_order_json(state: &PreviewState, space_id: &str) -> String {
    let order = state
        .directory_items
        .iter()
        .filter(|item| item.space_id == space_id)
        .map(|item| json_string(&item.id))
        .collect::<Vec<_>>();
    format!("[{}]", order.join(","))
}

fn preview_visible_blocks_json(
    state: &PreviewState,
    space: &PreviewSpace,
    template: &PreviewTemplate,
    hidden_block_ids: &[String],
) -> String {
    let blocks = template
        .blocks
        .iter()
        .filter(|block| !hidden_block_ids.contains(&block.id))
        .enumerate()
        .map(|(index, block)| preview_block_json(state, space, template, block, true, index))
        .collect::<Vec<_>>();
    format!("[{}]", blocks.join(","))
}

fn preview_block_json(
    state: &PreviewState,
    space: &PreviewSpace,
    template: &PreviewTemplate,
    block: &PreviewTemplateBlock,
    visible: bool,
    index: usize,
) -> String {
    let contract = preview_block_contract_json(state, block);
    let order = index + 1;
    format!(
        "{{\"id\":{},\"type\":{},\"title\":{},\"space\":{},\"template\":{},\"config\":{},\"layout\":{{\"xs\":{{\"order\":{}}}}},\"order\":{},\"visible\":{},\"contract\":{}}}",
        json_string(&block.id),
        json_string(&block.block_type),
        localized_text_json(&block.title),
        json_string(&space.id),
        json_string(&template.key),
        preview_block_config_json(block),
        order,
        order,
        if visible { "true" } else { "false" },
        contract
    )
}

fn preview_block_config_json(block: &PreviewTemplateBlock) -> String {
    match block.block_type.as_str() {
        "calendar_upcoming" => format!(
            "{{\"limit\":{},\"window\":\"week\",\"include_archived\":false,\"include_reminders\":true}}",
            block.limit
        ),
        "inventory_summary" => format!(
            "{{\"limit\":{},\"attention_limit\":{},\"slice\":\"pantry\",\"include_archived\":false}}",
            block.limit,
            block.limit.max(1)
        ),
        _ => format!("{{\"limit\":{}}}", block.limit),
    }
}

fn preview_block_contract_json(state: &PreviewState, block: &PreviewTemplateBlock) -> String {
    match block.block_type.as_str() {
        "calendar_upcoming" => {
            let resource = preview_resource_inspect_json(state, &["calendar"]);
            format!(
                "{{\"source_kind\":\"knowledge-api\",\"entry_kind\":\"calendar-entry\",\"summary_kind\":\"calendar-upcoming\",\"inspect\":{{\"path\":\"/api/knowledge/v1/calendar/upcoming\",\"preferred_target\":\"resource\",\"params\":{{\"window\":\"week\",\"include_archived\":false,\"include_reminders\":true,\"limit\":{}}},\"resource\":{}}}}}",
                block.limit.max(1),
                resource.unwrap_or_else(|| "null".to_string())
            )
        }
        "inventory_summary" => {
            let resource = preview_resource_inspect_json(state, &["inventory"]);
            format!(
                "{{\"source_kind\":\"knowledge-api\",\"entry_kind\":\"inventory-item\",\"summary_kind\":\"inventory-summary\",\"summary_slice\":\"pantry\",\"inspect\":{{\"path\":\"/api/knowledge/v1/inventory/summary\",\"preferred_target\":\"resource\",\"params\":{{\"slice\":\"pantry\",\"include_archived\":false,\"attention_limit\":{}}},\"resource\":{}}}}}",
                block.limit.max(1),
                resource.unwrap_or_else(|| "null".to_string())
            )
        }
        _ => format!(
            "{{\"source_kind\":\"atrium-materialized-entries\",\"entry_kind\":\"service-link\",\"selector\":{{\"classification\":\"default_on\",\"pinned_only\":true,\"limit\":{}}}}}",
            block.limit.max(1)
        ),
    }
}

fn preview_resource_inspect_json(state: &PreviewState, resource_ids: &[&str]) -> Option<String> {
    let entry = state.directory_items.iter().find(|item| {
        let normalized_title = localized_text_sort_key(&item.title);
        resource_ids.iter().any(|resource_id| {
            item.resource_id.eq_ignore_ascii_case(resource_id)
                || normalized_title == resource_id.to_ascii_lowercase()
        })
    })?;
    let url = entry.url.trim();
    if url.is_empty() {
        return None;
    }
    Some(format!(
        "{{\"id\":{},\"title\":{},\"url\":{}}}",
        json_string(&entry.resource_id),
        localized_text_json(&entry.title),
        json_string(url)
    ))
}

fn preview_create_space(state: &mut PreviewState, body: &str) -> String {
    let title = extract_json_string(body, "title").unwrap_or_else(|| "Untitled".to_string());
    let id = extract_json_string(body, "slug")
        .or_else(|| extract_json_string(body, "id"))
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| slugify(&title));
    if state.catalog.spaces.iter().any(|space| space.id == id) {
        return format!(
            "{{\"error\":\"space_already_exists\",\"space_id\":{}}}",
            json_string(&id)
        );
    }
    let space = PreviewSpace {
        title: localized_text(&format!("atrium.space.{id}.title"), &title, ""),
        state: "active".to_string(),
        space_type: extract_json_string(body, "type").unwrap_or_else(|| "staff".to_string()),
        layout: extract_json_string(body, "layout_mode").unwrap_or_else(|| "grid".to_string()),
        description: localized_text(
            &format!("atrium.space.{id}.description"),
            &extract_nested_json_string(body, "display_config", "description").unwrap_or_default(),
            "",
        ),
        groups: extract_json_string_array(body, "visibility_groups"),
        dashboard_template: "admin-default".to_string(),
        id,
    };
    if let Err(error) = write_preview_space_file(&state.client_root_dir(), &space) {
        return format!(
            "{{\"error\":\"space_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    state.catalog.spaces.push(space.clone());
    state.catalog.spaces.sort_by(|left, right| left.id.cmp(&right.id));
    state.reload_catalog();
    preview_space_json(&space)
}

fn preview_patch_space(state: &mut PreviewState, space_id: &str, body: &str) -> (&'static str, &'static str, String) {
    let Some(space) = state.catalog.spaces.iter_mut().find(|space| space.id == space_id) else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"space_not_found\"}".to_string(),
        );
    };
    if let Some(title) = extract_json_string(body, "title") {
        space.title = localized_text(&format!("atrium.space.{}.title", space.id), &title, "");
    }
    if let Some(space_type) = extract_json_string(body, "type") {
        space.space_type = space_type;
    }
    if let Some(layout) = extract_json_string(body, "layout_mode") {
        space.layout = layout;
    }
    if let Some(description) = extract_nested_json_string(body, "display_config", "description") {
        space.description = localized_text(
            &format!("atrium.space.{}.description", space.id),
            &description,
            "",
        );
    }
    if let Some(groups) = extract_optional_json_string_array(body, "visibility_groups") {
        space.groups = groups;
    }
    let updated_space = space.clone();
    if let Err(error) = write_preview_space_file(&state.client_root_dir(), &updated_space) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"space_write_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        preview_space_json(&updated_space),
    )
}

fn preview_archive_space(state: &mut PreviewState, space_id: &str, archived: bool) -> (&'static str, &'static str, String) {
    let Some(space) = state.catalog.spaces.iter_mut().find(|space| space.id == space_id) else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"space_not_found\"}".to_string(),
        );
    };
    space.state = if archived { "archived" } else { "active" }.to_string();
    let updated_space = space.clone();
    if let Err(error) = write_preview_space_file(&state.client_root_dir(), &updated_space) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"space_write_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        preview_space_json(&updated_space),
    )
}

fn preview_delete_space(state: &mut PreviewState, space_id: &str) -> (&'static str, &'static str, String) {
    if let Err(error) = delete_preview_space_files(&state.client_root_dir(), space_id) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"space_delete_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    let before = state.catalog.spaces.len();
    state.catalog.spaces.retain(|space| space.id != space_id);
    state.directory_items.retain(|item| item.space_id != space_id);
    if state.catalog.spaces.len() == before {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"space_not_found\"}".to_string(),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        format!("{{\"deleted\":true,\"space_id\":{}}}", json_string(space_id)),
    )
}

fn preview_create_directory_item(state: &mut PreviewState, body: &str) -> String {
    let space_id = extract_json_string(body, "space_id").unwrap_or_else(|| "admin".to_string());
    let title = extract_json_string(body, "title").unwrap_or_else(|| "Untitled".to_string());
    let resource_id = preview_next_resource_id(state, &title);
    let item = PreviewDirectoryItem {
        id: format!("{space_id}:{resource_id}"),
        title: localized_text(&format!("atrium.resource.{resource_id}.title"), &title, ""),
        description: localized_text(
            &format!("atrium.resource.{resource_id}.description"),
            &extract_json_string(body, "description").unwrap_or_default(),
            "",
        ),
        resource_id,
        space_id,
        url: extract_json_string(body, "url").unwrap_or_default(),
        item_type: extract_json_string(body, "item_type").unwrap_or_else(|| "resource".to_string()),
        pinned: extract_json_bool(body, "pinned").unwrap_or(false),
        order: preview_next_directory_order(state),
    };
    if let Err(error) = write_preview_directory_item_files(&state.client_root_dir(), &item) {
        return format!(
            "{{\"error\":\"directory_item_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    state.reload_catalog();
    preview_directory_item_json(
        state
            .directory_items
            .iter()
            .find(|candidate| candidate.id == item.id)
            .unwrap_or(&item),
    )
}

fn preview_patch_directory_item(state: &mut PreviewState, item_id: &str, body: &str) -> (&'static str, &'static str, String) {
    let Some(existing_item) = state.directory_items.iter().find(|item| item.id == item_id).cloned() else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"directory_item_not_found\"}".to_string(),
        );
    };
    let mut item = existing_item;
    if let Some(title) = extract_json_string(body, "title") {
        item.title = localized_text(&format!("atrium.resource.{}.title", item.resource_id), &title, "");
    }
    if let Some(url) = extract_json_string(body, "url") {
        item.url = url;
    }
    if let Some(item_type) = extract_json_string(body, "item_type") {
        item.item_type = item_type;
    }
    if let Some(pinned) = extract_json_bool(body, "pinned") {
        item.pinned = pinned;
    }
    if let Err(error) = write_preview_directory_item_files(&state.client_root_dir(), &item) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"directory_item_write_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        preview_directory_item_json(
            state
                .directory_items
                .iter()
                .find(|candidate| candidate.id == item.id)
                .unwrap_or(&item),
        ),
    )
}

fn preview_delete_directory_item(state: &mut PreviewState, item_id: &str) -> (&'static str, &'static str, String) {
    let Some(item) = state.directory_items.iter().find(|item| item.id == item_id).cloned() else {
        return (
            "404 Not Found",
            "application/json; charset=utf-8",
            "{\"error\":\"directory_item_not_found\"}".to_string(),
        );
    };
    if let Err(error) = delete_preview_directory_item_files(&state.client_root_dir(), &item) {
        return (
            "500 Internal Server Error",
            "application/json; charset=utf-8",
            format!(
                "{{\"error\":\"directory_item_delete_failed\",\"message\":{}}}",
                json_string(&error.to_string())
            ),
        );
    }
    state.reload_catalog();
    (
        "200 OK",
        "application/json; charset=utf-8",
        format!("{{\"deleted\":true,\"item_id\":{}}}", json_string(item_id)),
    )
}

fn preview_next_resource_id(state: &mut PreviewState, title: &str) -> String {
    let base = slugify(title);
    let mut candidate = if base.is_empty() {
        state.next_generated_id("resource")
    } else {
        base
    };
    while state.directory_items.iter().any(|item| item.resource_id == candidate) {
        candidate = format!("{candidate}-{}", state.next_id);
        state.next_id += 1;
    }
    candidate
}

fn preview_next_directory_order(state: &PreviewState) -> i64 {
    state
        .directory_items
        .iter()
        .map(|item| item.order)
        .max()
        .unwrap_or(0)
        + 10
}

fn preview_save_dashboard(state: &mut PreviewState, requested_space_id: Option<&str>, body: &str) -> String {
    let Some(space_id) = preview_current_space(state, requested_space_id).map(|space| space.id.clone()) else {
        return "{\"error\":\"space_not_found\"}".to_string();
    };
    let viewer = preview_viewer();
    let Some(space) = preview_current_space(state, Some(space_id.as_str())).cloned() else {
        return "{\"error\":\"space_not_found\"}".to_string();
    };
    let mut blocks = extract_dashboard_blocks(body);
    if blocks.is_empty() {
        blocks = preview_template_for_space(state, &space).blocks;
    }
    let requested_order = extract_json_string_array(body, "block_order");
    let hidden_block_ids = extract_json_string_array(body, "hidden_block_ids");
    let ordered_blocks = preview_order_dashboard_blocks(blocks, &requested_order);
    let valid_hidden_block_ids = preview_filter_hidden_block_ids(&ordered_blocks, &hidden_block_ids);
    let template = PreviewTemplate {
        key: space.dashboard_template.clone(),
        blocks: ordered_blocks.clone(),
    };
    if let Err(error) = write_preview_template_file(&state.client_root_dir(), &template) {
        return format!(
            "{{\"error\":\"dashboard_template_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    if let Err(error) =
        write_preview_dashboard_hidden_blocks(
            &state.client_root_dir(),
            &viewer.user_id,
            &space.id,
            &valid_hidden_block_ids,
        )
    {
        return format!(
            "{{\"error\":\"dashboard_overlay_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    state.reload_catalog();
    let Some(current_space) = preview_current_space(state, Some(space_id.as_str())) else {
        return format!(
            "{{\"error\":\"space_not_found\",\"space_id\":{}}}",
            json_string(&space_id)
        );
    };
    format!(
        "{{\"saved\":true,\"space_id\":{},\"template_id\":{},\"blocks_count\":{},\"hidden_block_ids\":{},\"workspace\":{},\"diagnostics\":[]}}",
        json_string(&space_id),
        json_string(&space.dashboard_template),
        ordered_blocks.len(),
        json_string_array(&valid_hidden_block_ids),
        preview_workspace_object_json(state, current_space)
    )
}

fn preview_static_response(raw_path: &str) -> Option<(&'static str, &'static str, String)> {
    let dist_dir = preview_dist_dir()?;
    let path = raw_path.split('?').next().unwrap_or("/");
    let relative_path = path.trim_start_matches('/');

    if relative_path.is_empty() {
        return preview_read_static_file(&dist_dir.join("index.html"));
    }

    if relative_path
        .split('/')
        .any(|segment| segment.is_empty() || segment == "." || segment == ".." || segment.contains('\\'))
    {
        return None;
    }

    let asset_path = dist_dir.join(relative_path);
    if asset_path.is_file() {
        return preview_read_static_file(&asset_path);
    }

    if !relative_path.contains('.') {
        return preview_read_static_file(&dist_dir.join("index.html"));
    }

    None
}

fn preview_dist_dir() -> Option<PathBuf> {
    env::var("VOID_ATRIUM_WEB_DIST_DIR")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .filter(|path| path.is_dir())
}

fn preview_read_static_file(path: &Path) -> Option<(&'static str, &'static str, String)> {
    let content_type = preview_content_type(path);
    let body = fs::read_to_string(path).ok()?;
    Some(("200 OK", content_type, body))
}

fn preview_content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|value| value.to_str()).unwrap_or_default() {
        "html" => "text/html; charset=utf-8",
        "js" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml; charset=utf-8",
        "map" => "application/json; charset=utf-8",
        "txt" => "text/plain; charset=utf-8",
        _ => "text/plain; charset=utf-8",
    }
}

fn write_preview_space_file(client_root: &Path, space: &PreviewSpace) -> std::io::Result<()> {
    let spaces_dir = client_root.join("spaces");
    fs::create_dir_all(&spaces_dir)?;
    let path = spaces_dir.join(format!("{}.yaml", space.id));
    fs::write(path, preview_space_yaml(space))
}

fn delete_preview_space_files(client_root: &Path, space_id: &str) -> std::io::Result<()> {
    let space_path = client_root.join("spaces").join(format!("{space_id}.yaml"));
    if space_path.exists() {
        fs::remove_file(space_path)?;
    }
    let placement_path = client_root.join("placements").join(format!("{space_id}.yaml"));
    if placement_path.exists() {
        fs::remove_file(placement_path)?;
    }
    Ok(())
}

fn write_preview_directory_item_files(client_root: &Path, item: &PreviewDirectoryItem) -> std::io::Result<()> {
    let resources_dir = client_root.join("resources");
    let placements_dir = client_root.join("placements");
    fs::create_dir_all(&resources_dir)?;
    fs::create_dir_all(&placements_dir)?;

    let resource_path = resources_dir.join(format!("{}.yaml", item.resource_id));
    fs::write(&resource_path, preview_resource_yaml(item))?;

    let placement_path = placements_dir.join(format!("{}.yaml", item.space_id));
    let existing_source = fs::read_to_string(&placement_path).unwrap_or_default();
    let mut entries = parse_placement_resources(&existing_source);
    if let Some(existing) = entries
        .iter_mut()
        .find(|entry| entry.resource_id == item.resource_id)
    {
        existing.pinned = item.pinned;
        existing.order = item.order;
    } else {
        entries.push(PreviewPlacementEntry {
            resource_id: item.resource_id.clone(),
            pinned: item.pinned,
            order: item.order,
        });
    }
    entries.sort_by(|left, right| (left.order, &left.resource_id).cmp(&(right.order, &right.resource_id)));
    fs::write(&placement_path, preview_placement_yaml(&item.space_id, &entries))?;
    Ok(())
}

fn delete_preview_directory_item_files(client_root: &Path, item: &PreviewDirectoryItem) -> std::io::Result<()> {
    let resource_path = client_root
        .join("resources")
        .join(format!("{}.yaml", item.resource_id));
    if resource_path.exists() {
        fs::remove_file(resource_path)?;
    }

    let placement_path = client_root
        .join("placements")
        .join(format!("{}.yaml", item.space_id));
    let source = fs::read_to_string(&placement_path).unwrap_or_default();
    let mut entries = parse_placement_resources(&source);
    entries.retain(|entry| entry.resource_id != item.resource_id);
    if entries.is_empty() {
        if placement_path.exists() {
            fs::remove_file(placement_path)?;
        }
    } else {
        fs::write(&placement_path, preview_placement_yaml(&item.space_id, &entries))?;
    }
    Ok(())
}

fn write_preview_template_file(client_root: &Path, template: &PreviewTemplate) -> std::io::Result<()> {
    let templates_dir = client_root.join("templates");
    fs::create_dir_all(&templates_dir)?;
    let path = templates_dir.join(format!("{}.yaml", template.key));
    fs::write(path, preview_template_yaml(template))
}

fn preview_hidden_block_ids(state: &PreviewState, space: &PreviewSpace) -> Vec<String> {
    let viewer = preview_viewer();
    load_preview_dashboard_hidden_blocks(&state.client_root_dir(), &viewer.user_id, &space.id)
}

fn load_preview_dashboard_hidden_blocks(
    client_root: &Path,
    user_id: &str,
    space_id: &str,
) -> Vec<String> {
    let path = preview_dashboard_overlay_path(client_root, user_id, space_id);
    let source = fs::read_to_string(&path)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| fs::read_to_string(preview_legacy_dashboard_overlay_path(client_root, space_id)).ok())
        .unwrap_or_default();
    parse_string_list(&source, "hidden_blocks")
}

fn write_preview_dashboard_hidden_blocks(
    client_root: &Path,
    user_id: &str,
    space_id: &str,
    hidden_block_ids: &[String],
) -> std::io::Result<()> {
    let path = preview_dashboard_overlay_path(client_root, user_id, space_id);
    if hidden_block_ids.is_empty() {
        if path.exists() {
            fs::remove_file(path)?;
        }
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut lines = vec!["hidden_blocks:".to_string()];
    for block_id in hidden_block_ids {
        lines.push(format!("  - {}", yaml_string(block_id)));
    }
    lines.push(String::new());
    fs::write(path, lines.join("\n"))
}

fn preview_dashboard_overlay_path(client_root: &Path, user_id: &str, space_id: &str) -> PathBuf {
    let user_key = preview_filesystem_key(user_id, "user");
    let space_key = preview_filesystem_key(space_id, "space");
    client_root
        .join("user-overlays")
        .join(user_key)
        .join(format!("{space_key}.yaml"))
}

fn preview_legacy_dashboard_overlay_path(client_root: &Path, space_id: &str) -> PathBuf {
    client_root
        .join("dashboard-overrides")
        .join(format!("{space_id}.yaml"))
}

fn preview_filesystem_key(value: &str, fallback: &str) -> String {
    let slug = slugify(value);
    if slug.is_empty() {
        fallback.to_string()
    } else {
        slug
    }
}

fn preview_space_yaml(space: &PreviewSpace) -> String {
    let mut lines = vec![
        format!("id: {}", yaml_string(&space.id)),
        "title:".to_string(),
    ];
    lines.extend(localized_text_yaml_lines(&space.title, 2));
    lines.extend([
        format!("state: {}", yaml_string(&space.state)),
        format!("type: {}", yaml_string(&space.space_type)),
        "description:".to_string(),
    ]);
    lines.extend(localized_text_yaml_lines(&space.description, 2));
    lines.extend([
        format!("layout: {}", yaml_string(&space.layout)),
        "groups:".to_string(),
    ]);
    for group in &space.groups {
        lines.push(format!("  - {}", yaml_string(group)));
    }
    lines.push(format!(
        "dashboard_template: {}",
        yaml_string(&space.dashboard_template)
    ));
    lines.push(String::new());
    lines.join("\n")
}

fn preview_resource_yaml(item: &PreviewDirectoryItem) -> String {
    let mut lines = vec![
        format!("id: {}", yaml_string(&item.resource_id)),
        "title:".to_string(),
    ];
    lines.extend(localized_text_yaml_lines(&item.title, 2));
    lines.extend([
        "description:".to_string(),
    ]);
    lines.extend(localized_text_yaml_lines(&item.description, 2));
    lines.extend([
        format!("url: {}", yaml_string(&item.url)),
        format!("type: {}", yaml_string(&item.item_type)),
        "state: \"active\"".to_string(),
        String::new(),
    ]);
    lines.join("\n")
}

fn preview_placement_yaml(space_id: &str, entries: &[PreviewPlacementEntry]) -> String {
    let mut lines = vec![
        format!("space: {}", yaml_string(space_id)),
        "resources:".to_string(),
    ];
    for entry in entries {
        lines.push(format!("  - resource: {}", yaml_string(&entry.resource_id)));
        lines.push(format!(
            "    pinned: {}",
            if entry.pinned { "true" } else { "false" }
        ));
        lines.push(format!("    order: {}", entry.order));
    }
    lines.push(String::new());
    lines.join("\n")
}

fn preview_template_yaml(template: &PreviewTemplate) -> String {
    let mut lines = vec![format!("id: {}", yaml_string(&template.key)), "blocks:".to_string()];
    for block in &template.blocks {
        lines.push(format!("  - id: {}", yaml_string(&block.id)));
        lines.push(format!("    type: {}", yaml_string(&block.block_type)));
        lines.push("    title:".to_string());
        lines.extend(localized_text_yaml_lines(&block.title, 6));
        lines.push("    config:".to_string());
        lines.push(format!("      limit: {}", block.limit));
    }
    lines.push(String::new());
    lines.join("\n")
}

fn localized_text_sort_key(value: &LocalizedText) -> String {
    value
        .translations
        .get("en")
        .or_else(|| value.translations.values().next())
        .map(|item| item.to_lowercase())
        .unwrap_or_else(|| value.key.to_lowercase())
}

fn localized_text_json(value: &LocalizedText) -> String {
    let translations = value
        .translations
        .iter()
        .map(|(lang, text)| format!("{}:{}", json_string(lang), json_string(text)))
        .collect::<Vec<_>>();
    format!(
        "{{\"key\":{},\"translations\":{{{}}}}}",
        json_string(&value.key),
        translations.join(",")
    )
}

fn localized_text_yaml_lines(value: &LocalizedText, indent: usize) -> Vec<String> {
    let prefix = " ".repeat(indent);
    let mut lines = vec![format!("{prefix}key: {}", yaml_string(&value.key))];
    lines.push(format!("{prefix}translations:"));
    for (lang, text) in &value.translations {
        lines.push(format!("{prefix}  {lang}: {}", yaml_string(text)));
    }
    lines
}

fn parse_localized_text(source: &str, key: &str, default_key: &str) -> LocalizedText {
    let lines = source.lines().collect::<Vec<_>>();
    let field_prefix = format!("{key}:");
    let Some((index, field_line)) = lines
        .iter()
        .enumerate()
        .find(|(_, line)| line.trim() == field_prefix)
    else {
        return LocalizedText {
            key: default_key.to_string(),
            translations: BTreeMap::new(),
        };
    };

    let base_indent = leading_spaces(field_line);
    let mut text = LocalizedText {
        key: default_key.to_string(),
        translations: BTreeMap::new(),
    };
    let mut in_translations = false;
    let mut translations_indent = 0usize;

    for line in lines.iter().skip(index + 1) {
        if line.trim().is_empty() {
            continue;
        }
        let indent = leading_spaces(line);
        if indent <= base_indent {
            break;
        }
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("key:") {
            let parsed = unquote(value.trim()).to_string();
            if !parsed.is_empty() {
                text.key = parsed;
            }
            in_translations = false;
        } else if trimmed == "translations:" {
            in_translations = true;
            translations_indent = indent;
        } else if in_translations && indent > translations_indent {
            if let Some((lang, value)) = trimmed.split_once(':') {
                let lang = lang.trim().to_ascii_lowercase();
                let value = unquote(value.trim()).to_string();
                if !lang.is_empty() && !value.is_empty() {
                    text.translations.insert(lang, value);
                }
            }
        } else {
            in_translations = false;
        }
    }

    text
}

fn leading_spaces(value: &str) -> usize {
    value.chars().take_while(|ch| *ch == ' ').count()
}

fn parse_scalar(source: &str, key: &str) -> Option<String> {
    let prefix = format!("{key}:");
    source.lines().find_map(|line| {
        let trimmed = line.trim();
        trimmed
            .strip_prefix(&prefix)
            .map(|value| unquote(value.trim()).to_string())
            .filter(|value| !value.is_empty())
    })
}

fn parse_string_list(source: &str, key: &str) -> Vec<String> {
    let mut items = Vec::new();
    let mut in_list = false;
    let list_prefix = format!("{key}:");
    for line in source.lines() {
        if !in_list {
            if line.trim() == list_prefix {
                in_list = true;
            }
            continue;
        }

        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("- ") {
            let normalized = unquote(value.trim()).to_string();
            if !normalized.is_empty() {
                items.push(normalized);
            }
            continue;
        }

        if !trimmed.is_empty() {
            break;
        }
    }
    items
}

fn parse_placement_resources(source: &str) -> Vec<PreviewPlacementEntry> {
    let mut items = Vec::new();
    let mut in_list = false;
    let mut current: Option<PreviewPlacementEntry> = None;

    for line in source.lines() {
        let trimmed = line.trim();
        if !in_list {
            if trimmed == "resources:" {
                in_list = true;
            }
            continue;
        }

        if let Some(value) = trimmed.strip_prefix("- resource:") {
            if let Some(entry) = current.take() {
                items.push(entry);
            }
            current = Some(PreviewPlacementEntry {
                resource_id: unquote(value.trim()).to_string(),
                pinned: false,
                order: 100,
            });
            continue;
        }

        let Some(entry) = current.as_mut() else {
            if !trimmed.is_empty() {
                break;
            }
            continue;
        };

        if let Some(value) = trimmed.strip_prefix("resource:") {
            entry.resource_id = unquote(value.trim()).to_string();
        } else if let Some(value) = trimmed.strip_prefix("pinned:") {
            entry.pinned = matches!(unquote(value.trim()), "true" | "True" | "TRUE" | "yes" | "on");
        } else if let Some(value) = trimmed.strip_prefix("order:") {
            entry.order = unquote(value.trim()).parse::<i64>().unwrap_or(100);
        } else if !trimmed.is_empty() && !line.starts_with(' ') {
            break;
        }
    }

    if let Some(entry) = current.take() {
        items.push(entry);
    }

    items
}

fn preview_order_dashboard_blocks(
    blocks: Vec<PreviewTemplateBlock>,
    requested_order: &[String],
) -> Vec<PreviewTemplateBlock> {
    let mut block_map = BTreeMap::new();
    let mut original_order = Vec::new();
    for block in blocks {
        if !original_order.contains(&block.id) {
            original_order.push(block.id.clone());
        }
        block_map.insert(block.id.clone(), block);
    }

    let mut ordered_ids = Vec::new();
    for block_id in requested_order {
        let normalized = block_id.trim();
        if normalized.is_empty() || ordered_ids.iter().any(|existing| existing == normalized) {
            continue;
        }
        if block_map.contains_key(normalized) {
            ordered_ids.push(normalized.to_string());
        }
    }
    for block_id in original_order {
        if !ordered_ids.iter().any(|existing| existing == &block_id) {
            ordered_ids.push(block_id);
        }
    }
    ordered_ids
        .into_iter()
        .filter_map(|block_id| block_map.remove(&block_id))
        .collect()
}

fn preview_filter_hidden_block_ids(
    blocks: &[PreviewTemplateBlock],
    hidden_block_ids: &[String],
) -> Vec<String> {
    let available_ids = blocks
        .iter()
        .map(|block| block.id.clone())
        .collect::<Vec<_>>();
    let mut filtered = Vec::new();
    for block_id in hidden_block_ids {
        let normalized = block_id.trim();
        if normalized.is_empty()
            || filtered.iter().any(|existing| existing == normalized)
            || !available_ids.iter().any(|available| available == normalized)
        {
            continue;
        }
        filtered.push(normalized.to_string());
    }
    filtered
}

fn parse_template_blocks(source: &str) -> Vec<PreviewTemplateBlock> {
    let mut blocks = Vec::new();
    let mut current: Option<PreviewTemplateBlock> = None;

    for line in source.lines() {
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("- id:") {
            if let Some(block) = current.take() {
                blocks.push(normalize_block(block));
            }
            current = Some(PreviewTemplateBlock {
                id: unquote(value.trim()).to_string(),
                block_type: String::new(),
                title: LocalizedText {
                    key: String::new(),
                    translations: BTreeMap::new(),
                },
                limit: 8,
            });
            continue;
        }

        let Some(block) = current.as_mut() else {
            continue;
        };
        if let Some(value) = trimmed.strip_prefix("type:") {
            block.block_type = unquote(value.trim()).to_string();
        } else if let Some(value) = trimmed.strip_prefix("title:") {
            let title = unquote(value.trim()).to_string();
            if !title.is_empty() {
                block.title = localized_text("", &title, "");
            }
        } else if let Some(value) = trimmed.strip_prefix("limit:") {
            if let Ok(limit) = unquote(value.trim()).parse::<i64>() {
                block.limit = limit;
            }
        }
    }

    if let Some(block) = current.take() {
        blocks.push(normalize_block(block));
    }

    blocks
}

fn normalize_block(mut block: PreviewTemplateBlock) -> PreviewTemplateBlock {
    if block.id.trim().is_empty() {
        block.id = "preview-block".to_string();
    }
    if block.block_type.trim().is_empty() {
        block.block_type = "resources_pinned".to_string();
    }
    if block.title.key.trim().is_empty() {
        block.title.key = format!("atrium.block.{}.title", block.id);
    }
    if block.title.translations.is_empty() {
        block.title = localized_text(&block.title.key, "Key resources", "Ключевые ресурсы");
    }
    block
}

fn parse_widgets_count(source: &str) -> usize {
    let mut in_widgets = false;
    let mut count = 0usize;
    for line in source.lines() {
        let trimmed = line.trim();
        if !in_widgets {
            if trimmed == "widgets:" {
                in_widgets = true;
            }
            continue;
        }
        if trimmed.starts_with("- ") {
            count += 1;
            continue;
        }
        if !trimmed.is_empty() {
            break;
        }
    }
    count
}

fn query_param(raw_path: &str, key: &str) -> Option<String> {
    let query = raw_path.split_once('?')?.1;
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let current_key = parts.next().unwrap_or_default().trim();
        if current_key != key {
            continue;
        }
        let value = parts.next().unwrap_or_default().trim();
        if !value.is_empty() {
            return Some(value.to_string());
        }
    }
    None
}

fn request_body(request: &str) -> &str {
    request
        .split_once("\r\n\r\n")
        .map(|(_, body)| body)
        .or_else(|| request.split_once("\n\n").map(|(_, body)| body))
        .unwrap_or("")
}

fn extract_json_string(body: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\"");
    let start = body.find(&needle)?;
    let tail = &body[start + needle.len()..];
    let colon = tail.find(':')?;
    let value = tail[colon + 1..].trim_start();
    let rest = value.strip_prefix('"')?;
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn extract_nested_json_string(body: &str, object_key: &str, key: &str) -> Option<String> {
    let object_needle = format!("\"{object_key}\"");
    let object_start = body.find(&object_needle)?;
    let object_tail = &body[object_start + object_needle.len()..];
    let brace_start = object_tail.find('{')?;
    let object_body = &object_tail[brace_start..];
    extract_json_string(object_body, key)
}

fn extract_json_bool(body: &str, key: &str) -> Option<bool> {
    let needle = format!("\"{key}\"");
    let start = body.find(&needle)?;
    let tail = &body[start + needle.len()..];
    let colon = tail.find(':')?;
    let value = tail[colon + 1..].trim_start();
    if value.starts_with("true") {
        Some(true)
    } else if value.starts_with("false") {
        Some(false)
    } else {
        None
    }
}

fn extract_optional_json_string_array(body: &str, key: &str) -> Option<Vec<String>> {
    if !body.contains(&format!("\"{key}\"")) {
        return None;
    }
    Some(extract_json_string_array(body, key))
}

fn extract_json_string_array(body: &str, key: &str) -> Vec<String> {
    let needle = format!("\"{key}\"");
    let Some(start) = body.find(&needle) else {
        return Vec::new();
    };
    let tail = &body[start + needle.len()..];
    let Some(bracket_start) = tail.find('[') else {
        return Vec::new();
    };
    let tail = &tail[bracket_start + 1..];
    let Some(bracket_end) = tail.find(']') else {
        return Vec::new();
    };
    tail[..bracket_end]
        .split(',')
        .filter_map(|value| {
            let trimmed = unquote(value.trim());
            (!trimmed.is_empty()).then(|| trimmed.to_string())
        })
        .collect()
}

fn extract_dashboard_blocks(body: &str) -> Vec<PreviewTemplateBlock> {
    let mut blocks = Vec::new();
    let mut remaining = body;
    while let Some(index) = remaining.find("\"type\"") {
        let block_body = &remaining[index..];
        let block_type = extract_json_string(block_body, "type").unwrap_or_else(|| "resources_pinned".to_string());
        let id = extract_json_string(block_body, "id").unwrap_or_else(|| "preview-block".to_string());
        let title = extract_json_string(block_body, "title").unwrap_or_else(|| "Preview block".to_string());
        let limit = extract_json_number(block_body, "limit").unwrap_or(8);
        blocks.push(PreviewTemplateBlock {
            title: localized_text(&format!("atrium.block.{id}.title"), &title, ""),
            id,
            block_type,
            limit,
        });
        remaining = &block_body[6..];
    }
    blocks
}

fn extract_json_number(body: &str, key: &str) -> Option<i64> {
    let needle = format!("\"{key}\"");
    let start = body.find(&needle)?;
    let tail = &body[start + needle.len()..];
    let colon = tail.find(':')?;
    let value = tail[colon + 1..].trim_start();
    let digits = value
        .chars()
        .take_while(|ch| ch.is_ascii_digit() || *ch == '-')
        .collect::<String>();
    digits.parse::<i64>().ok()
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in value.chars() {
        let lower = ch.to_ascii_lowercase();
        if lower.is_ascii_alphanumeric() {
            slug.push(lower);
            last_dash = false;
        } else if !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}

fn localized_text(key: &str, en: &str, ru: &str) -> LocalizedText {
    let mut translations = BTreeMap::new();
    if !en.trim().is_empty() {
        translations.insert("en".to_string(), en.to_string());
    }
    if !ru.trim().is_empty() {
        translations.insert("ru".to_string(), ru.to_string());
    }
    LocalizedText {
        key: key.to_string(),
        translations,
    }
}

fn default_preview_space() -> PreviewSpace {
    PreviewSpace {
        id: "admin".to_string(),
        title: localized_text("atrium.space.admin.title", "Admin", "Администрирование"),
        state: "active".to_string(),
        space_type: "staff".to_string(),
        layout: "grid".to_string(),
        description: localized_text(
            "atrium.space.admin.description",
            "Workspace administration",
            "Управление рабочим пространством",
        ),
        groups: vec!["admin".to_string()],
        dashboard_template: "admin-default".to_string(),
    }
}

fn default_preview_block() -> PreviewTemplateBlock {
    PreviewTemplateBlock {
        id: "key-resources".to_string(),
        block_type: "resources_pinned".to_string(),
        title: localized_text("atrium.block.key-resources.title", "Key resources", "Ключевые ресурсы"),
        limit: 8,
    }
}

fn default_preview_template() -> PreviewTemplate {
    PreviewTemplate {
        key: "admin-default".to_string(),
        blocks: vec![default_preview_block()],
    }
}

fn preview_space_json(space: &PreviewSpace) -> String {
    format!(
        "{{\"id\":{},\"title\":{},\"state\":{},\"type\":{},\"layout\":{},\"groups\":{},\"description\":{},\"display_config\":{{\"dashboard_template_key\":{}}},\"dashboard_template\":{},\"provisioning_dashboard_template\":{},\"is_provisioned\":true,\"is_default_public_entry\":false}}",
        json_string(&space.id),
        localized_text_json(&space.title),
        json_string(&space.state),
        json_string(&space.space_type),
        json_string(&space.layout),
        json_string_array(&space.groups),
        localized_text_json(&space.description),
        json_string(&space.dashboard_template),
        json_string(&space.dashboard_template),
        json_string(&space.dashboard_template),
    )
}

fn preview_template_json(template: &PreviewTemplate) -> String {
    format!(
        "{{\"key\":{},\"version\":1}}",
        json_string(&template.key)
    )
}

fn preview_blocks_json(
    state: &PreviewState,
    space: &PreviewSpace,
    template: &PreviewTemplate,
    hidden_block_ids: &[String],
) -> String {
    let blocks = template
        .blocks
        .iter()
        .enumerate()
        .map(|(index, block)| {
            preview_block_json(
                state,
                space,
                template,
                block,
                !hidden_block_ids.contains(&block.id),
                index,
            )
        })
        .collect::<Vec<_>>();
    format!("[{}]", blocks.join(","))
}

fn preview_widgets_json(catalog: &PreviewCatalog) -> String {
    if catalog.widget_count == 0 {
        return "[]".to_string();
    }

    let mut widgets = Vec::with_capacity(catalog.widget_count);
    for index in 0..catalog.widget_count {
        widgets.push(format!(
            "{{\"id\":{},\"type\":\"markdown\",\"title\":{},\"content\":{},\"spaces\":[\"*\"],\"_preview\":true}}",
            json_string(&format!("preview-widget-{}", index + 1)),
            json_string(&format!("Preview widget {}", index + 1)),
            json_string(&format!("Loaded from {}", catalog.widgets_path)),
        ));
    }
    format!("[{}]", widgets.join(","))
}

fn unquote(value: &str) -> &str {
    value
        .strip_prefix('"')
        .and_then(|inner| inner.strip_suffix('"'))
        .or_else(|| {
            value
                .strip_prefix('\'')
                .and_then(|inner| inner.strip_suffix('\''))
        })
        .unwrap_or(value)
}

fn json_string(value: &str) -> String {
    let escaped = value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n");
    format!("\"{escaped}\"")
}

fn json_string_array(values: &[String]) -> String {
    let parts = values.iter().map(|value| json_string(value)).collect::<Vec<_>>();
    format!("[{}]", parts.join(","))
}

fn yaml_string(value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{escaped}\"")
}
