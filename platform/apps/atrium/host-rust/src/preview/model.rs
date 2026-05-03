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
