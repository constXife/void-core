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
