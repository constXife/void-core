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
